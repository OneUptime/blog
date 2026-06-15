# Validation Summary: How to Implement Runtime Application Self-Protection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Runtime Application Self-Protection (RASP)
- OpenRASP
- Java agents and Docker
- Kubernetes
- Kubernetes mutating admission webhooks
- Falco
- Falco Helm chart
- Falcosidekick
- Flask / Python middleware
- PrometheusRule alerting

## Sources Consulted
- OpenRASP README and supported platforms: https://github.com/baidu/openrasp
- OpenRASP installation wiki: https://github.com/baidu/openrasp/wiki/Installation
- OpenRASP configuration documentation: https://rasp.baidu.com/doc/setup/others.html
- OpenRASP v1.3.7 Java release archive contents: https://github.com/baidu/openrasp/releases/download/v1.3.7/rasp-java.tar.gz
- Falco Helm chart README: https://github.com/falcosecurity/charts/blob/master/charts/falco/README.md
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falco rules documentation: https://falco.org/docs/concepts/rules/basic-elements/
- Falco supported fields documentation: https://falco.org/docs/reference/rules/supported-fields/
- Falcosidekick Prometheus output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/prometheus.md
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- OpenRASP support was listed as Java, PHP, and Node.js. Changed it to Java and PHP to match the upstream supported platform list.
- The OpenRASP Dockerfile downloaded the Windows ZIP package and assumed `/opt/rasp/rasp.jar` existed after extraction. Changed it to download the Linux `rasp-java.tar.gz`, extract it, and move the packaged `rasp` directory into `/opt/rasp`.
- The OpenRASP configuration used unsupported keys such as `app_id`, `master_url`, nested `plugin.timeout.millis`, nested `security`, nested `log`, and UDP syslog. Replaced them with documented flat OpenRASP keys including `cloud.*`, `plugin.timeout.millis`, `plugin.maxstack`, `log.*`, and TCP syslog settings.
- The Falco Helm values used outdated or incorrect keys: `driver.kind: ebpf`, `jsonOutput`, `jsonIncludeOutputProperty`, and `rulesFile`. Updated them to `modern_ebpf`, `json_output`, `json_include_output_property`, and `rules_files`.
- The Falco custom rules referenced undefined or incorrectly typed constants. Converted process and port constants to Falco lists, added an `allowed_images` list, and kept reusable expressions as macros.
- The suspicious outbound connection rule used `fd.sport`, which is the local source port. Changed it to `fd.rport` to match destination-port detection.
- The Falcosidekick Prometheus config used an unsupported `prometheus.enabled` setting. Replaced it with the documented `prometheus.extralabels` setting.
- The mutating webhook example referenced a ConfigMap name that did not match the later sidecar ConfigMap, omitted the Service used by `clientConfig.service`, and omitted required `admissionReviewVersions`. Updated the ConfigMap reference, added a Service, and added `admissionReviewVersions` and `timeoutSeconds`.
- The Flask snippet used `request.json` and had an unused `wraps` import. Replaced JSON parsing with `request.get_json(silent=True)` and removed the unused import.
- The Falco Prometheus alert queried `falco_events`, which does not match Falcosidekick's Prometheus metric. Updated it to `falcosidekick_falco_events_total{priority_raw="critical"}`.

## Review Notes
- The sidecar proxy configuration is illustrative because it references a custom `security/rasp-proxy:1.0` image rather than a documented public product schema.
- The `rasp_attacks_total` Prometheus alerts assume the RASP layer exports that metric; the Python logging example does not implement metric export.
- Local Helm and kubectl binaries were not installed, so CLI verification was performed against official upstream Helm chart documentation and values files. YAML snippets and the Python snippet were syntax-checked locally.
