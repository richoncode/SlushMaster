import requests, json, sys

BASE = 'http://localhost:8000'
VIDEO = 'usmnt-1min-2_5s.mp4'

def print_resp(r):
    try:
        data = r.json()
    except Exception:
        data = r.text
    print('Status:', r.status_code)
    print(json.dumps(data, indent=2))

# 1. Detect field corners
print('--- Detect Field Corners ---')
resp = requests.post(f'{BASE}/detect-field-corners?filename={VIDEO}')
print_resp(resp)
if resp.status_code != 200:
    sys.exit(1)
corners = resp.json()

# 2. Detect players
print('\n--- Detect Players ---')
payload = {
    'filename': VIDEO,
    'top_corners': corners.get('top_corners'),
    'bottom_corners': corners.get('bottom_corners')
}
resp = requests.post(f'{BASE}/detect-players', json=payload)
print_resp(resp)
if resp.status_code != 200:
    sys.exit(1)
players = resp.json()

# 3. Segment first frame
print('\n--- Segment First Frame ---')
payload = {
    'filename': VIDEO,
    'top_players': players.get('top_players'),
    'bottom_players': players.get('bottom_players')
}
resp = requests.post(f'{BASE}/segment-first-frame', json=payload)
print_resp(resp)
