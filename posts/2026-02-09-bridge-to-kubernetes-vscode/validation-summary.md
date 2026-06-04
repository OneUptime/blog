# Validation Summary: How to Set Up Bridge to Kubernetes for Visual Studio Code Local Debugging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Bridge to Kubernetes
- Visual Studio Code
- Kubernetes
- kubectl
- Node.js
- Express
- Axios
- Python
- Flask
- VS Code debugging configuration

## Sources Consulted
- Microsoft Learn: Use Bridge to Kubernetes (VS Code): https://learn.microsoft.com/en-us/previous-versions/visualstudio/bridge/bridge-to-kubernetes-vs-code
- Microsoft Learn: How Bridge to Kubernetes works: https://learn.microsoft.com/en-us/previous-versions/visualstudio/bridge/overview-bridge-to-kubernetes
- Microsoft Learn: Configure Bridge to Kubernetes: https://learn.microsoft.com/en-us/previous-versions/visualstudio/bridge/configure-bridge-to-kubernetes
- Microsoft Learn: Kubernetes service environment variables with Bridge to Kubernetes: https://learn.microsoft.com/en-us/previous-versions/visualstudio/bridge/kubernetes-environment-variables
- Microsoft Learn: Debug multiple services with Bridge to Kubernetes: https://learn.microsoft.com/en-us/previous-versions/visualstudio/bridge/parallel-services
- Azure/Bridge-To-Kubernetes retirement issue: https://github.com/Azure/Bridge-To-Kubernetes/issues/655
- Azure/Bridge-To-Kubernetes README: https://github.com/Azure/Bridge-To-Kubernetes
- VS Code Node.js debugging: https://code.visualstudio.com/docs/nodejs/nodejs-debugging
- VS Code Python debugging: https://code.visualstudio.com/docs/python/debugging
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes namespace DNS documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Flask debugging and development server documentation: https://flask.palletsprojects.com/en/stable/debugging/
- Flask changelog for FLASK_ENV removal: https://flask.palletsprojects.com/en/2.3.x/changes/

## Issues Found
- Bridge to Kubernetes was presented as current tooling. Added a retirement caveat because Microsoft and the Azure GitHub project state that Bridge to Kubernetes was retired on April 30, 2025.
- The architecture description said Bridge routes through a sidecar proxy and generally modifies the local network stack. Reworded it to match Microsoft Learn: Bridge uses a remote agent, `kubectl port-forward`, local hosts-file entries, environment information, and routing components for isolation mode.
- The workspace settings example used unsupported-looking `bridge-to-kubernetes.*` settings for namespace and isolation. Replaced it with the documented approach of setting the current namespace with `kubectl` and using `.vscode/tasks.json` for Bridge task configuration.
- The post said cluster services are made accessible via DNS. Clarified that Bridge uses local host name resolution updates or Kubernetes service environment variables.
- The Node.js and Python examples did not propagate the `kubernetes-route-as` header, which is required for Bridge isolation to work across downstream service calls. Updated both examples to forward the header when present.
- The multiple-service section omitted the same-`isolateAs` requirement for isolated multi-service debugging. Added that caveat.
- The isolated-mode example showed settings JSON rather than the documented Bridge task properties. Replaced it with a `bridge-to-kubernetes.service` task object.
- The Python launch configuration used deprecated `"type": "python"`. Updated it to `"type": "debugpy"` per current VS Code Python debugging documentation.
- The Python launch configuration used `FLASK_ENV`, which Flask removed in 2.3. Replaced it with `FLASK_DEBUG`.
- The Bridge log and route-monitoring commands pointed to an extension-local log path and network-route checks. Updated them to the documented temp log directory, hosts-file inspection, and `kubectl port-forward` process inspection.

## Review Notes
The Kubernetes Deployment, Service, DNS names, service environment variable usage, `kubectl wait` command shape, Node.js launch/attach examples, and Flask sample syntax were otherwise consistent with official documentation. Local `kubectl` and VS Code CLI binaries were not installed in this environment, so those commands were verified against official documentation rather than local `--help` output.
