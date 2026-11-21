import hashlib
import json
import re
import sys

# GitHub owner/repository names, one per line; no credentials or URLs.
count, index = int(sys.argv[1]), int(sys.argv[2])
if count < 1 or not 0 <= index < count:
    raise SystemExit('Require count > 0 and 0 <= index < count')
names = [line.strip().lower() for line in sys.stdin if line.strip()]
if any(not re.fullmatch(r'[a-z0-9_.-]+/[a-z0-9_.-]+', name) for name in names):
    raise SystemExit('Expected owner/repository names')
if len(names) != len(set(names)):
    raise SystemExit('Duplicate repository in inventory')
selected = []
for name in sorted(names):
    bucket = int.from_bytes(hashlib.sha256(name.encode()).digest()[:8], 'big') % count
    if bucket == index:
        selected.append(name)
json.dump(selected, sys.stdout, indent=2)
sys.stdout.write('\n')
