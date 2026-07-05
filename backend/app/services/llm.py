import json
import re

from openai import OpenAI

from ..config import Config


def _client() -> OpenAI:
    if not Config.LLM_API_KEY:
        raise RuntimeError('LLM_API_KEY not configured')
    return OpenAI(api_key=Config.LLM_API_KEY, base_url=Config.LLM_BASE_URL)


def _chat(system: str, user: str, temperature: float = 0.4) -> str:
    client = _client()
    resp = client.chat.completions.create(
        model=Config.LLM_MODEL_NAME,
        temperature=temperature,
        messages=[
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': user},
        ],
    )
    return resp.choices[0].message.content or ''


def _parse_json(text: str):
    text = text.strip()
    fence = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def generate_premortem(context: dict) -> dict:
    system = (
        'You are a strategic risk advisor. Return JSON only with keys: '
        'title, scenario, failureMode, leadingIndicators (array), mitigation, suggestedAssumptions (array of strings).'
    )
    user = json.dumps(context, ensure_ascii=False)
    raw = _chat(system, user, temperature=0.5)
    try:
        return _parse_json(raw)
    except json.JSONDecodeError:
        return {
            'title': 'Generated premortem',
            'scenario': raw,
            'failureMode': '',
            'leadingIndicators': [],
            'mitigation': '',
            'suggestedAssumptions': [],
        }


def generate_blind_spot(context: dict) -> dict:
    system = (
        'You are an organizational blind-spot coach. Return JSON only with keys: '
        'question (string), rationale (string), followUps (array of strings).'
    )
    user = json.dumps(context, ensure_ascii=False)
    raw = _chat(system, user, temperature=0.6)
    try:
        return _parse_json(raw)
    except json.JSONDecodeError:
        return {'question': raw, 'rationale': '', 'followUps': []}


def analyze_org(context: dict) -> dict:
    system = (
        'You are a strategy execution analyst. Analyze assumption health for an organization. '
        'Return JSON only with keys: '
        'summary (string), topRisks (array of {title, detail, severity}), '
        'recommendedActions (array of strings), newAssumptionsToLog (array of {statement, category, criticality}).'
    )
    user = json.dumps(context, ensure_ascii=False)
    return _parse_json(_chat(system, user))


def enhance_brief(brief: str, context: dict) -> str:
    system = (
        'You are a board advisor. Enhance this executive brief with sharper insight, '
        'specific risks, and actionable recommendations. Keep markdown format. Be direct, no fluff.'
    )
    user = f"Brief:\n{brief}\n\nContext:\n{json.dumps(context, ensure_ascii=False)}"
    return _chat(system, user, temperature=0.35)


def extract_assumptions(text: str) -> list[dict]:
    system = (
        'Extract strategic assumptions from the text. Return JSON array of objects with keys: '
        'statement, category (market|customer|technology|regulatory|people|financial|operations), '
        'confidence (1-5), criticality (1-5), evidence (string). Max 12 items.'
    )
    raw = _chat(system, text, temperature=0.3)
    data = _parse_json(raw)
    return data if isinstance(data, list) else data.get('assumptions', [])


def interpret_signals(assumptions: list, search_results: list) -> list[dict]:
    system = (
        'Given assumptions and web search results, identify contradicting or supporting signals. '
        'Return JSON array of objects with keys: title, summary, severity (low|medium|high), '
        'direction (contradicts|supports), assumptionIndex (int index into assumptions list), source (string).'
    )
    user = json.dumps({'assumptions': assumptions, 'search_results': search_results}, ensure_ascii=False)
    data = _parse_json(_chat(system, user, temperature=0.25))
    return data if isinstance(data, list) else data.get('signals', [])