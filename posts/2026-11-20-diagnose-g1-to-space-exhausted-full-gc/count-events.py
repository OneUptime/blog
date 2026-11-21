import re
import sys

failures = set()
full = set()
with open(sys.argv[1], encoding='utf-8') as stream:
    for line in stream:
        event = re.search(r'GC\((\d+)\)', line)
        if not event:
            continue
        if 'To-space exhausted' in line:
            failures.add(event[1])
        if 'Pause Full' in line:
            full.add(event[1])
print(f'Evacuation-failure events: {len(failures)}')
print(f'Full-GC events: {len(full)}')
