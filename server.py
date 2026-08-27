import http.server
import socketserver
import os
import sys

PORT = 3000
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # 간결한 요청 로그
        sys.stderr.write("%s - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format%args))

class ThreadedHTTPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    with ThreadedHTTPServer(("0.0.0.0", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"Serving HTTP on 0.0.0.0 port {PORT} (Multi-threaded, No-Cache)...")
        httpd.serve_forever()
