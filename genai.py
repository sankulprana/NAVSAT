from __future__ import annotations

import json
import os
import socket
import urllib.request
from functools import lru_cache


def _template_brief(
    *,
    satellite_name: str,
    altitude_km: float,
    velocity_km_s: float,
    inclination_deg: float,
    fuel_capacity: float,
    efficiency: float,
    collision_risk: str,
    adjusted_fuel: float,
) -> str:
    # Deterministic fallback that always works.
    recommendations = []
    if efficiency < 60:
        recommendations.append("Increase efficiency by moving altitude/velocity closer to the nominal LEO sweet spot (~700 km, ~7.8 km/s).")
    else:
        recommendations.append("Maintain parameters near the current operating point; the predicted efficiency is strong.")
    if collision_risk.strip().lower() in {"high", "medium"}:
        recommendations.append("Consider adjusting altitude bands to reduce the heuristic collision-risk label and re-run the simulation.")
    else:
        recommendations.append("Collision-risk label is low; continue monitoring for changes with new inputs.")
    if fuel_capacity > 0 and adjusted_fuel > fuel_capacity:
        recommendations.append("Fuel estimate exceeds capacity; reduce maneuver complexity (inclination) or adjust velocity and rerun.")
    else:
        recommendations.append("Fuel estimate is within capacity; validate across multiple candidate parameter sets.")

    return (
        f"Mission Brief — {satellite_name}\n\n"
        "Summary\n"
        f"- Orbit inputs: altitude {altitude_km:.0f} km, velocity {velocity_km_s:.2f} km/s, inclination {inclination_deg:.1f}°.\n"
        f"- Predicted efficiency: {efficiency:.1f}/100.\n"
        f"- Collision risk (heuristic): {collision_risk}.\n"
        f"- Fuel estimate (efficiency-adjusted): {adjusted_fuel:.2f} units (capacity: {fuel_capacity:.0f}).\n\n"
        "Recommendations\n"
        f"1) {recommendations[0]}\n"
        f"2) {recommendations[1]}\n"
        f"3) {recommendations[2]}\n"
    )


@lru_cache(maxsize=1)
def _get_generator():
    """
    Lazily load an open-source text generation pipeline.

    Notes:
    - First run will download the model files.
    - Kept small on purpose (demo-friendly).
    """
    from transformers import pipeline

    return pipeline("text-generation", model="distilgpt2")


def _ollama_generate(prompt: str, *, model: str, timeout_s: float) -> str:
    # Ollama local endpoint: http://localhost:11434/api/generate
    url = "http://127.0.0.1:11434/api/generate"
    payload = {"model": model, "prompt": prompt, "stream": False}
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_s) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return str(data.get("response") or "").strip()


def generate_mission_brief(
    *,
    satellite_name: str,
    altitude_km: float,
    velocity_km_s: float,
    inclination_deg: float,
    fuel_capacity: float,
    efficiency: float,
    collision_risk: str,
    adjusted_fuel: float,
) -> str:
    prompt = (
        "You are a mission-control assistant. Write a concise mission brief (150-250 words) "
        "for a satellite trajectory simulation. Use clear bullet points and end with 3 actionable recommendations.\n\n"
        f"Satellite: {satellite_name}\n"
        f"Altitude_km: {altitude_km:.0f}\n"
        f"Velocity_km_s: {velocity_km_s:.2f}\n"
        f"Inclination_deg: {inclination_deg:.1f}\n"
        f"Fuel_capacity: {fuel_capacity:.0f}\n"
        f"Predicted_efficiency_0_100: {efficiency:.1f}\n"
        f"Collision_risk_label: {collision_risk}\n"
        f"Adjusted_fuel_estimate: {adjusted_fuel:.2f}\n\n"
        "Brief:\n"
    )

    backend = (os.getenv("NAVSAT_GENAI_BACKEND") or "ollama").strip().lower()
    timeout_s = float(os.getenv("NAVSAT_GENAI_TIMEOUT_S") or "12")

    # Prefer Ollama (no Python deps) when available.
    if backend in {"ollama", "auto"}:
        try:
            model = os.getenv("NAVSAT_OLLAMA_MODEL") or "llama3"
            text = _ollama_generate(prompt, model=model, timeout_s=timeout_s)
            if text:
                return text
        except (OSError, socket.timeout, ValueError):
            pass
        except Exception:
            # Any unexpected failure should not break the app.
            pass

    # Optional local transformers fallback (may require large downloads).
    if backend in {"transformers", "auto"}:
        try:
            generator = _get_generator()
            out = generator(
                prompt,
                max_new_tokens=220,
                do_sample=True,
                temperature=0.7,
                top_p=0.92,
                num_return_sequences=1,
                pad_token_id=50256,
            )
            text = out[0]["generated_text"]
            return text.split("Brief:\n", 1)[-1].strip()
        except Exception:
            pass

    return _template_brief(
        satellite_name=satellite_name,
        altitude_km=altitude_km,
        velocity_km_s=velocity_km_s,
        inclination_deg=inclination_deg,
        fuel_capacity=fuel_capacity,
        efficiency=efficiency,
        collision_risk=collision_risk,
        adjusted_fuel=adjusted_fuel,
    )

