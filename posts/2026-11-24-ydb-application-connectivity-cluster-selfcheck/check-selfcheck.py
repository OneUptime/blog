import json
import sys
from pathlib import Path

known = {"GOOD", "DEGRADED", "MAINTENANCE_REQUIRED", "EMERGENCY"}
try:
    report = json.loads(Path("selfcheck.json").read_text())
    status = report.get("self_check_result") if isinstance(report, dict) else None
    if not isinstance(status, str) or status not in known:
        raise ValueError("Missing or unknown self_check_result")
except (OSError, ValueError) as error:
    print(f"UNKNOWN: {error}", file=sys.stderr)
    raise SystemExit(2)

print(status)
raise SystemExit(0 if status == "GOOD" else 1)
