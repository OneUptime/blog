import csv
import re
import sys

# Scoped to the time,uptime,level,tags layout and G1 summary lines shown here.
pattern = re.compile(
    r'^\[([^]]+)\]\[([0-9.]+)s\]\[info\]\[gc\s*\] '
    r'GC\((\d+)\) (Pause .*) ([0-9.]+)ms$'
)
writer = csv.writer(sys.stdout)
writer.writerow(['end_time', 'end_uptime_s', 'gc_id', 'duration_ms', 'description'])
with open(sys.argv[1], encoding='utf-8') as stream:
    for line in stream:
        match = pattern.match(line.strip())
        if match:
            end_time, uptime, gc_id, description, duration = match.groups()
            writer.writerow([end_time, uptime, gc_id, duration, description])
