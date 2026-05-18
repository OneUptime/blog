# Validation Summary: How to Set Up Sigma Rules for Log Detection on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Sigma rule format (YAML detection rules)
- sigma-cli (pySigma-based modern CLI, replaces legacy sigmac)
- SigmaHQ rules repository
- pySigma backends: elasticsearch, splunk, ibm-qradar-aql
- pySigma processing pipelines (linux pipeline)
- Elasticsearch / Kibana saved objects import
- MITRE ATT&CK technique IDs (T1078, T1110, T1548.003, T1053.003)
- Ubuntu system logs (`/var/log/auth.log`, `/var/log/syslog`)

## Sources Consulted
- SigmaHQ/sigma-cli — https://github.com/SigmaHQ/sigma-cli
- SigmaHQ backends documentation — https://sigmahq.io/docs/digging-deeper/backends.html
- pySigma-backend-elasticsearch — https://github.com/SigmaHQ/pySigma-backend-elasticsearch
- pySigma-pipeline-linux — https://github.com/SigmaHQ/pySigma-pipeline-linux
- IBM/pySigma-backend-QRadar-AQL — https://github.com/IBM/pySigma-backend-QRadar-AQL
- SigmaHQ/sigma repository (default branch) — https://github.com/SigmaHQ/sigma
- Zed/zq documentation — https://zed.brimdata.io/docs/commands/zq
- MITRE ATT&CK — https://attack.mitre.org/

## Issues Found

1. **YAML indentation error in the SSH Brute Force rule.** `condition: keywords` was outside the `detection:` block, which would make the rule invalid Sigma YAML. Fixed by indenting it under `detection:`.

2. **Non-existent Elasticsearch pipeline `ecs_linux`.** The `pySigma-backend-elasticsearch` package does not ship an `ecs_linux` pipeline (it provides `ecs_windows`, `ecs_windows_old`, `ecs_zeek_beats`, `ecs_zeek_corelight`, `zeek_raw`, `ecs_kubernetes`, `ecs_macos_esf`). Replaced with `--pipeline linux` and added `sigma plugin install linux` to the install steps so the `pySigma-pipeline-linux` package is present.

3. **`sigma plugin install qradar` is not the canonical identifier.** The current PyPI / SigmaHQ plugin identifier is `ibm-qradar-aql` (package `pySigma-backend-QRadar-AQL`). Updated the plugin install command accordingly.

4. **`sigma convert --target grep` does not exist.** sigma-cli has no `grep` backend (the grep emitter was a legacy `sigmac` feature, not ported to pySigma). The entire "Convert to grep" section was removed, as were references to it in the intro and conclusion.

5. **`sigma convert --target json` does not exist.** There is no standalone `json` target. JSON-shaped output is produced by specific backends via `--format` options (e.g. `kibana_ndjson`). Section removed.

6. **"Running Detections Against Local Logs" section was structurally broken.** It mentioned `evtx2es` (a Windows EVTX → Elasticsearch tool that has no Linux log relevance), used an invalid zq download URL (`releases/latest/download/zed-linux-amd64.tar.gz` does not exist — Zed assets are versioned, e.g. `zed-v1.5.0.linux-amd64.tar.gz`), used invalid Zed query syntax (`where msg contains "..."` — Zed's `where` operator does not support a `contains` keyword), and embedded an automated scan script that depended on the non-existent grep backend. Section removed.

7. **Description metadata and intro referenced removed workflows.** Updated the post description to drop "grep, jq" and "sigmac", and softened the intro sentence so it no longer promises grep conversion.

## Review Notes

- Default branch of SigmaHQ/sigma is `master`, so `git pull origin master` is correct (verified).
- MITRE ATT&CK technique IDs cited in the rules are accurate: T1078 (Valid Accounts), T1110 (Brute Force), T1548.003 (Sudo and Sudo Caching), T1053.003 (Cron).
- The Sudo rule's `selection` includes `'sudo'` as a contains-substring among other COMMAND values; because Message will almost always contain "sudo" when the log source is auth.log sudo entries, this is effectively a broad match — design choice, not a syntax bug, so left as-is.
- `sigma --version` works in current sigma-cli releases; `sigma plugin list` and `sigma check` are also valid commands.
- The `pySigma-pipeline-linux` package exposes a pipeline identifier of `linux`; users running an older sigma-cli without that plugin installed will get an error, which is why an explicit `sigma plugin install linux` was added.
- The Kibana saved-objects import endpoint (`/api/saved_objects/_import`) and required headers (`kbn-xsrf: true`, `Authorization: ApiKey ...`) are correct for Elastic Stack 8.x.
- `sigma-cli` is under active development; users should periodically run `pip install --upgrade sigma-cli` and re-run `sigma plugin list` to check for backend/pipeline changes.
