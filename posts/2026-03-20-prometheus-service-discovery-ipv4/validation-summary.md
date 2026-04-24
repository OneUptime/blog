# Validation Summary: How to Set Up Prometheus Service Discovery for IPv4 Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus service discovery
- File-based service discovery (`file_sd`)
- DNS-based service discovery (`dns_sd`)
- HTTP-based service discovery (`http_sd`)
- Consul service discovery (`consul_sd`)
- YAML configuration
- JSON target group format
- Python
- Flask

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus file-based service discovery guide: https://prometheus.io/docs/guides/file-sd/
- Prometheus HTTP service discovery documentation: https://prometheus.io/docs/prometheus/latest/http_sd/
- Flask API reference for `Flask.run()`: https://flask.palletsprojects.com/en/stable/api/#flask.Flask.run
- Flask documentation for returning JSON with `jsonify()`: https://flask.palletsprojects.com/en/stable/patterns/javascript/#return-json-from-views

## Issues Found
- The `file_sd` JSON example included a `// /etc/prometheus/targets/app-servers.json` comment inside a `json` code block. JSON does not allow comments, and Prometheus requires well-formed JSON or YAML target groups for file-based service discovery. I removed the comment so the example is valid JSON if copied into a real target file.
- The `http_sd` description said the endpoint returns a "JSON list of targets." Prometheus HTTP SD actually expects a JSON list of target groups (the same structure as static configs). I updated that wording for accuracy.

## Review Notes
- The Prometheus configuration examples are otherwise consistent with the current Prometheus configuration reference for `static_configs`, `file_sd_configs`, `dns_sd_configs`, `http_sd_configs`, and `consul_sd_configs`.
- The Flask example is valid for demonstrating an HTTP SD endpoint, and `jsonify()` satisfies Prometheus's JSON response requirement. Flask's built-in `run()` server is a development server and should not be used as a production service discovery backend.
