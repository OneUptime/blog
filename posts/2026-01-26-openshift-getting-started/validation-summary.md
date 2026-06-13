# Validation Summary: How to Get Started with OpenShift

## Status
validated

## Post Type
Tutorial / getting started guide

## Technologies Covered
- Red Hat OpenShift Container Platform
- Kubernetes Deployments, Services, Pods, ConfigMaps, and Secrets
- OpenShift `oc` CLI
- OpenShift Projects and RBAC
- OpenShift Routes
- OpenShift BuildConfigs and Source-to-Image (S2I)
- OpenShift ImageStreams
- OpenShift Security Context Constraints (SCCs)
- Red Hat UBI container images

## Sources Consulted
- Red Hat OpenShift Container Platform documentation: Creating applications with `oc new-app` - https://docs.redhat.com/en/documentation/openshift_container_platform/4.8/html/building_applications/creating-applications
- Red Hat OpenShift Container Platform documentation: Configuring routes - https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/networking/configuring-routes
- Red Hat OpenShift Container Platform documentation: Deployments and DeploymentConfigs - https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/building_applications/deployments
- Red Hat OpenShift Container Platform documentation: BuildConfig API - https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/workloads_apis/buildconfig-build-openshift-io-v1
- Red Hat OpenShift Container Platform documentation: Image streams and image stream triggers - https://docs.redhat.com/en/documentation/openshift_container_platform/4.19/html-single/images/index
- Red Hat OpenShift Container Platform documentation: Projects and namespaces / RBAC - https://docs.redhat.com/en/documentation/openshift_container_platform/4.16/html/authentication_and_authorization/using-rbac
- Red Hat OpenShift Container Platform documentation: Security context constraints - https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/authentication_and_authorization/managing-pod-security-policies
- Red Hat Ecosystem Catalog: UBI Apache httpd 2.4 image - https://catalog.redhat.com/en/software/containers/ubi9/httpd-24/61a60c3e3e9240fca360f74a
- Red Hat Ecosystem Catalog: Python 3.11 OpenShift usage - https://catalog.redhat.com/en/software/containers/ubi9/python-311/63f764b03f0b02a2e2d63fff

## Issues Found
- The container-image deployment example used the upstream `nginx:latest` image on port 80. That image commonly fails under OpenShift restricted SCC defaults because OpenShift runs containers with arbitrary non-root UIDs. Changed the example to use the Red Hat UBI Apache httpd image on port 8080.
- The Kubernetes Deployment manifest used `nginx:1.21` on port 80. That image is old and has the same OpenShift non-root compatibility issue. Changed it to the Red Hat UBI Apache httpd image and updated probes and service/route ports to 8080.
- The post described Routes as having "automatic TLS termination." Routes expose services externally and can terminate TLS when configured. Updated the wording and summary to avoid implying TLS is automatic for every route.
- The Projects explanation said quotas and RBAC policies are applied by default. OpenShift projects scope policies, quotas, service accounts, and RBAC, but quotas are configured by administrators. Updated the wording.
- The SCC section said OpenShift drops all Linux capabilities by default. Current OpenShift defaults use `restricted-v2` on new OpenShift 4.11+ installations, which drops default capabilities while allowing `NET_BIND_SERVICE` to be requested explicitly. Updated the wording.
- The debugging command comment said `oc debug deployment/<name>` starts a debug pod with a deployment config. Updated the comment to say it starts a debug pod from a Deployment pod template.
- The complete example was titled as a Flask application but used the `sclorg/django-ex` Django repository. Changed the heading, project name, app name, and commands to consistently describe a Django application, and updated the Python builder tag to the documented `python:3.11` image stream usage.

## Review Notes
The post is technically relevant and includes commands, YAML manifests, and OpenShift-specific implementation details. DeploymentConfig is correctly described as deprecated as of OpenShift Container Platform 4.14 and still supported but not recommended for new work. The examples are still beginner-oriented and assume the cluster has the standard OpenShift image streams and router configuration available.
