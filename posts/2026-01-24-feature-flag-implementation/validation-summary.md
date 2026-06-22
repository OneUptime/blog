# Validation Summary: How to Handle Feature Flag Implementation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Feature flags / feature toggles
- Python
- Unleash and the Unleash Python SDK
- Docker Compose
- PostgreSQL
- Flask
- Kubernetes Deployments and ConfigMaps
- Stakater Reloader
- watchdog
- pytest
- structlog

## Sources Consulted
- Python data model documentation for `__hash__()` randomization: https://docs.python.org/3/reference/datamodel.html#object.__hash__
- Python `PYTHONHASHSEED` documentation: https://docs.python.org/3/using/cmdline.html#envvar-PYTHONHASHSEED
- Python `hashlib` documentation: https://docs.python.org/3/library/hashlib.html
- Unleash Python SDK documentation: https://docs.getunleash.io/sdks/python
- Unleash Docker configuration documentation: https://docs.getunleash.io/deploy/configuring-unleash
- Unleash official Docker Compose example: https://github.com/Unleash/unleash/blob/main/docker-compose.yml
- Docker Compose file reference for obsolete top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Stakater Reloader annotation documentation: https://docs.stakater.com/reloader/1.4/reference/annotations.html

## Issues Found
- The simple Python rollout examples used Python's built-in `hash()` while describing the result as consistent. Python salts `str` and `bytes` hashes by default, so values are not predictable across interpreter invocations. Replaced the rollout and variant bucketing with a stable SHA-256-based helper.
- The Docker Compose snippet was marked as `bash` even though it is YAML, and it included the now-obsolete top-level `version` property. Changed the fence to `yaml` and removed `version`.
- The Unleash Python SDK example used the deprecated `environment` constructor option and omitted API token headers. Updated the example to pass `custom_headers={"Authorization": api_token}` and added `INIT_BACKEND_API_TOKENS` to the local Unleash compose example.
- The Kubernetes Deployment manifest omitted the required `.spec.selector` and matching pod template labels for `apps/v1`. Added a selector and `app: myapp` template labels.
- The ConfigMap watcher snippet used `os.path.dirname()` without importing `os`, held the watchdog `Observer` only in a local variable, and called an undefined `_evaluate_flag()` method. Added the missing import, stored the observer on `self`, and added a minimal evaluator with user targeting and percentage rollout support consistent with the surrounding examples.

## Review Notes
- Kubernetes mounted ConfigMaps update eventually rather than immediately, and ConfigMaps consumed as environment variables require a pod restart. The post's volume-based example is compatible with Kubernetes' mounted ConfigMap update behavior, while the Stakater Reloader annotation is valid for workloads that should restart on referenced ConfigMap changes.
