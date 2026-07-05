import requests

from ..config import Config


def tavily_search(query: str, max_results: int = 6) -> list[dict]:
    if not Config.TAVILY_API_KEY:
        return []
    resp = requests.post(
        'https://api.tavily.com/search',
        json={
            'api_key': Config.TAVILY_API_KEY,
            'query': query,
            'search_depth': 'basic',
            'max_results': max_results,
            'include_answer': True,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    results = []
    if data.get('answer'):
        results.append({'title': 'Tavily summary', 'snippet': data['answer'], 'url': '', 'source': 'tavily'})
    for item in data.get('results', []):
        results.append({
            'title': item.get('title', ''),
            'snippet': item.get('content', ''),
            'url': item.get('url', ''),
            'source': 'tavily',
        })
    return results


def serper_search(query: str, max_results: int = 6) -> list[dict]:
    if not Config.SERPER_API_KEY:
        return []
    resp = requests.post(
        'https://google.serper.dev/search',
        headers={'X-API-KEY': Config.SERPER_API_KEY, 'Content-Type': 'application/json'},
        json={'q': query, 'num': max_results},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    results = []
    for item in data.get('organic', [])[:max_results]:
        results.append({
            'title': item.get('title', ''),
            'snippet': item.get('snippet', ''),
            'url': item.get('link', ''),
            'source': 'serper',
        })
    return results


def scan_for_assumptions(assumptions: list[dict], extra_query: str = '') -> list[dict]:
    statements = [a.get('statement', '') for a in assumptions if a.get('statement')][:5]
    base = ' OR '.join(f'"{s[:80]}"' for s in statements if s)
    query = f'contradicting evidence OR market signal: {base}'
    if extra_query:
        query = f'{extra_query} {query}'

    seen = set()
    merged: list[dict] = []
    for fn in (tavily_search, serper_search):
        try:
            for r in fn(query):
                key = (r.get('title', ''), r.get('url', ''))
                if key in seen:
                    continue
                seen.add(key)
                merged.append(r)
        except requests.RequestException:
            continue
    return merged