#!/usr/bin/env bash
# Serves this folder locally so the site can be viewed at http://localhost:8000
cd "$(dirname "$0")"
echo "Serving Arizona Tech Labs site at http://localhost:8000"
python3 -m http.server 8000
