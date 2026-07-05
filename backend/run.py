import os
import sys

if sys.platform == 'win32':
    os.environ.setdefault('PYTHONIOENCODING', 'utf-8')
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.config import Config


def main():
    warnings = Config.validate()
    if warnings:
        print('\nStratum configuration:')
        for w in warnings:
            print(f'  ⚠ {w}')
        print('  → Copy .env.example to .env and add your API keys\n')
    else:
        print('\nStratum: all APIs configured ✓\n')

    app = create_app()
    print(f'Stratum running at http://localhost:{Config.PORT}')
    print('Press Ctrl+C to stop\n')
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG, threaded=True)


if __name__ == '__main__':
    main()