import os
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
env_path = os.path.join(project_root, '.env')

if os.path.exists(env_path):
    load_dotenv(env_path, override=True)
else:
    load_dotenv(override=True)


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'stratum-dev-key')
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    JSON_AS_ASCII = False

    HOST = os.environ.get('STRATUM_HOST', '0.0.0.0')
    PORT = int(os.environ.get('STRATUM_PORT', '8791'))

    LLM_API_KEY = os.environ.get('LLM_API_KEY')
    LLM_BASE_URL = os.environ.get('LLM_BASE_URL', 'https://api.groq.com/openai/v1')
    LLM_MODEL_NAME = os.environ.get('LLM_MODEL_NAME', 'qwen/qwen3-32b')

    TAVILY_API_KEY = os.environ.get('TAVILY_API_KEY')
    SERPER_API_KEY = os.environ.get('SERPER_API_KEY')

    @classmethod
    def status(cls) -> dict:
        return {
            'llm': bool(cls.LLM_API_KEY),
            'tavily': bool(cls.TAVILY_API_KEY),
            'serper': bool(cls.SERPER_API_KEY),
            'ready': bool(cls.LLM_API_KEY),
            'search_ready': bool(cls.TAVILY_API_KEY or cls.SERPER_API_KEY),
            'model': cls.LLM_MODEL_NAME if cls.LLM_API_KEY else None,
        }

    @classmethod
    def validate(cls) -> list[str]:
        warnings: list[str] = []
        if not cls.LLM_API_KEY:
            warnings.append('LLM_API_KEY not set — AI features disabled (local mode still works)')
        if not cls.TAVILY_API_KEY and not cls.SERPER_API_KEY:
            warnings.append('TAVILY_API_KEY and SERPER_API_KEY not set — web signal scan disabled')
        return warnings