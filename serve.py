#!/usr/bin/env python3
"""Serve Pose & Tell locally.

A tiny static server with no-cache headers. Browsers only allow webcam access
on secure origins, and http://localhost is treated as secure.
"""

from __future__ import annotations

import argparse
import functools
import http.server
import socketserver
import threading
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def log_message(self, format: str, *args: object) -> None:
        print(f"  {self.address_string()}  {format % args}")


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Pose & Tell locally.")
    parser.add_argument("--port", type=int, default=4173, help="Port to use (default: 4173)")
    parser.add_argument("--no-open", action="store_true", help="Don't open a browser automatically")
    args = parser.parse_args()

    handler = functools.partial(Handler, directory=str(ROOT))
    try:
        with ReusableTCPServer(("127.0.0.1", args.port), handler) as httpd:
            url = f"http://127.0.0.1:{args.port}/"
            print("\n  POSE & TELL")
            print(f"  Serving  {ROOT}")
            print(f"  Open     {url}")
            print("  Stop     Ctrl+C\n")
            if not args.no_open:
                threading.Timer(0.5, lambda: webbrowser.open(url)).start()
            httpd.serve_forever()
    except OSError as error:
        print(f"Couldn't start the server on port {args.port}: {error}")
        print("Try a different port: python3 serve.py --port 4180")
    except KeyboardInterrupt:
        print("\nCamera off. See you next round.")


if __name__ == "__main__":
    main()
