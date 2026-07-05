import os

from flask import Flask, send_from_directory
from flask_cors import CORS

from .config import Config


def create_app(config_class=Config):
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))

    app = Flask(__name__, static_folder=root, static_url_path='')
    app.config.from_object(config_class)

    if hasattr(app, 'json') and hasattr(app.json, 'ensure_ascii'):
        app.json.ensure_ascii = False

    CORS(app, resources={r'/api/*': {'origins': '*'}})

    from .api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    @app.route('/')
    def index():
        return send_from_directory(root, 'index.html')

    @app.route('/health')
    def health():
        return {'status': 'ok', 'service': 'Stratum'}

    return app