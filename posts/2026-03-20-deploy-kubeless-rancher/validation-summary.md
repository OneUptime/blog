# Validation Summary: How to Deploy Kubeless on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Kubeless (v1.0.8) — Kubernetes-native serverless framework
- Rancher (Kubernetes platform)
- Kubernetes CRDs (Function, HTTPTrigger, CronJobTrigger)
- kubectl
- Python 3.8 runtime
- Node.js 14 runtime

## Sources Consulted
- Kubeless GitHub repository (vmware-archive/kubeless): https://github.com/vmware-archive/kubeless
- Kubeless HTTP Triggers docs: https://github.com/vmware-archive/kubeless/blob/master/docs/http-triggers.md
- Kubeless cronjob trigger CLI source: https://github.com/vmware-archive/kubeless/blob/master/cmd/kubeless/trigger/cronjob/create.go
- Kubeless http trigger CLI source: https://github.com/vmware-archive/kubeless/blob/master/cmd/kubeless/trigger/http/create.go
- Kubeless v1.0.8 release: https://github.com/kubeless/kubeless/releases/tag/v1.0.8

## Issues Found
- **HTTPTrigger CRD spec fields were incorrect** in Step 5. The original YAML used `routeServiceName`, `servicePort`, and `cors`, none of which are valid HTTPTrigger spec fields. Per the Kubeless HTTPTrigger CRD definition, the correct fields are `function-name`, `host-name`, `path`, and `cors-enable`. The `servicePort` field was removed entirely because it does not exist in the HTTPTrigger spec; a `host-name` field was added (which is the natural counterpart, mirroring the `--hostname` CLI flag used in the same step). Updated to:
  ```yaml
  spec:
    function-name: hello
    host-name: functions.example.com
    path: /hello
    cors-enable: true
  ```

## Review Notes
- Kubeless is officially **archived/deprecated** (the project moved to vmware-archive on GitHub and is no longer actively maintained). v1.0.8 (released October 2020) is the final release. The post's conclusion already mentions Kubeless is less feature-rich than alternatives, but readers should be aware that for new production deployments Knative or OpenFaaS are better choices since Kubeless receives no security updates.
- The post installs Kubeless using the `kubeless-non-rbac-${KUBELESS_VERSION}.yaml` manifest. For a Rancher deployment with RBAC enabled (the default in modern Kubernetes/Rancher), the RBAC variant `kubeless-${KUBELESS_VERSION}.yaml` is typically more appropriate. Left unchanged since both manifests are official and the non-RBAC variant does work, but worth flagging.
- The `nodejs14` runtime was added in Kubeless v1.0.8 and is correct for the version pinned in Step 1.
- The `python3.8` runtime is correct for v1.0.8.
- The cronjob trigger CLI uses `--function` (verified in source); HTTP trigger CLI uses `--function-name` (verified in source). Both are used correctly in the post.
- The Function CRD spec fields (`function-content-type`, `handler`, `deps`, `runtime`, `function`) in Step 7 are all valid per the Function CRD definition.
- The CLI installation path (`bundles/kubeless_linux-amd64/kubeless`) reflects the actual zip layout of the v1.0.8 release artifact.
