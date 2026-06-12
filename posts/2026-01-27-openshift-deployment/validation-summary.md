# Validation Summary: How to Deploy Applications on OpenShift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat OpenShift
- Kubernetes Deployments and DeploymentConfigs
- OpenShift BuildConfigs, ImageStreams, Routes, and S2I
- ConfigMaps and Secrets
- Kubernetes liveness, readiness, startup, TCP, exec, and gRPC probes
- Horizontal Pod Autoscaler and resource requests/limits
- Node.js Express health endpoints

## Sources Consulted
- Red Hat OpenShift Container Platform 4.19 Deployments documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html/building_applications/deployments
- Red Hat OpenShift Container Platform 4.16 Routes documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.16/html/networking/configuring-routes
- Red Hat OpenShift Container Platform 4.18 ImageStreams with Kubernetes resources documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/images/using-imagestreams-with-kube-resources
- OKD 4.19 BuildConfig API reference: https://docs.okd.io/4.19/rest_api/workloads_apis/buildconfig-build-openshift-io-v1.html
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes probe configuration task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes ConfigMap pod usage documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/

## Issues Found
- DeploymentConfig guidance did not mention current deprecation status. Updated the DeploymentConfig section to state that DeploymentConfigs are deprecated as of OpenShift Container Platform 4.14, still supported, and should be avoided for new workloads unless DeploymentConfig-specific behavior is required.
- The DeploymentConfig example used `image: ' '`, which is not a valid useful container image value. Replaced it with a valid internal registry pullspec and clarified that the ImageChange trigger updates it to the resolved image pullspec.
- The Route custom certificate example implied that a Route can directly use a Secret for its TLS certificate and key. Updated the comment to state that the certificate and key are stored inline in `spec.tls`, matching the Route resource examples in OpenShift documentation.
- The `envFrom` example said all ConfigMap keys become environment variables even though file-style keys such as `app.properties` and `nginx.conf` are not valid environment variable names and are skipped by Kubernetes. Updated the comments to clarify that only valid environment variable keys are exposed and file-style keys should be mounted as files.
- The gRPC probe comment said Kubernetes 1.24+. Updated it to say gRPC probes are stable in Kubernetes 1.27+, matching current Kubernetes documentation.
- The opening description said OpenShift provides built-in CI/CD. Adjusted it to "build automation" to avoid implying that a full CI/CD pipeline product is inherently enabled by the core platform.

## Review Notes
The examples are intentionally generic and require real project names, image streams, services, certificates, secrets, and health endpoint implementations before use. The `oc` CLI was not installed in the local environment, so CLI flags were checked against official documentation rather than local `oc --help` output.
