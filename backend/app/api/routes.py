from flask import jsonify, request

from ..config import Config
from ..services import llm, search
from . import api_bp


@api_bp.route('/health', methods=['GET'])
def health():
    status = Config.status()
    return jsonify({
        'status': 'ok',
        'service': 'Stratum',
        'apis': status,
        'message': _health_message(status),
    })


def _health_message(status: dict) -> str:
    if status['ready'] and status['search_ready']:
        return 'All APIs configured — full features enabled'
    if status['ready']:
        return 'LLM ready — add Tavily or Serper for web signal scanning'
    return 'Running in local mode — add API keys to .env for AI features'


@api_bp.route('/ai/premortem', methods=['POST'])
def ai_premortem():
    if not Config.LLM_API_KEY:
        return jsonify({'error': 'LLM_API_KEY not configured'}), 400
    body = request.get_json(silent=True) or {}
    try:
        result = llm.generate_premortem(body)
        return jsonify({'ok': True, 'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/ai/blind-spot', methods=['POST'])
def ai_blind_spot():
    if not Config.LLM_API_KEY:
        return jsonify({'error': 'LLM_API_KEY not configured'}), 400
    body = request.get_json(silent=True) or {}
    try:
        result = llm.generate_blind_spot(body)
        return jsonify({'ok': True, 'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/ai/analyze', methods=['POST'])
def ai_analyze():
    if not Config.LLM_API_KEY:
        return jsonify({'error': 'LLM_API_KEY not configured'}), 400
    body = request.get_json(silent=True) or {}
    try:
        result = llm.analyze_org(body)
        return jsonify({'ok': True, 'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/ai/enhance-brief', methods=['POST'])
def ai_enhance_brief():
    if not Config.LLM_API_KEY:
        return jsonify({'error': 'LLM_API_KEY not configured'}), 400
    body = request.get_json(silent=True) or {}
    brief = body.get('brief', '')
    context = body.get('context', {})
    if not brief:
        return jsonify({'error': 'brief is required'}), 400
    try:
        enhanced = llm.enhance_brief(brief, context)
        return jsonify({'ok': True, 'brief': enhanced})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/ai/extract-assumptions', methods=['POST'])
def ai_extract():
    if not Config.LLM_API_KEY:
        return jsonify({'error': 'LLM_API_KEY not configured'}), 400
    body = request.get_json(silent=True) or {}
    text = body.get('text', '').strip()
    if not text:
        return jsonify({'error': 'text is required'}), 400
    try:
        assumptions = llm.extract_assumptions(text)
        return jsonify({'ok': True, 'assumptions': assumptions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/signals/scan', methods=['POST'])
def signals_scan():
    if not Config.LLM_API_KEY:
        return jsonify({'error': 'LLM_API_KEY not configured'}), 400
    if not (Config.TAVILY_API_KEY or Config.SERPER_API_KEY):
        return jsonify({'error': 'TAVILY_API_KEY or SERPER_API_KEY required for web scan'}), 400

    body = request.get_json(silent=True) or {}
    assumptions = body.get('assumptions', [])
    query = body.get('query', '')
    if not assumptions:
        return jsonify({'error': 'assumptions array required'}), 400

    try:
        raw_results = search.scan_for_assumptions(assumptions, query)
        interpreted = llm.interpret_signals(assumptions, raw_results)
        return jsonify({
            'ok': True,
            'raw_results': raw_results,
            'signals': interpreted,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500