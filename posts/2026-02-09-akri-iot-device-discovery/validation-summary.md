# Validation Summary: Deploy Akri on Kubernetes for Automatic Discovery of Edge IoT Leaf Devices

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Akri
- Kubernetes
- Helm
- ONVIF
- udev
- OPC UA
- Prometheus Operator
- Docker
- Python Flask and OpenCV

## Sources Consulted
- Akri Architecture Overview: https://docs.akri.sh/architecture/architecture-overview
- Akri ONVIF Discovery Handler documentation: https://docs.akri.sh/discovery-handlers/onvif
- Akri udev Discovery Handler documentation: https://docs.akri.sh/discovery-handlers/udev
- Akri OPC UA Discovery Handler documentation: https://docs.akri.sh/discovery-handlers/opc-ua
- Akri Requesting Resources documentation: https://docs.akri.sh/user-guide/requesting-akri-resources
- Akri Configuration-Level Resources documentation: https://docs.akri.sh/architecture/configuration-level-resource-in-depth
- Akri Custom Brokers documentation: https://docs.akri.sh/development/broker-development
- Akri Custom Discovery Handlers documentation: https://docs.akri.sh/v0.13/development/handler-development
- Akri Customizing an Installation documentation: https://docs.akri.sh/user-guide/customizing-an-akri-installation
- Akri Monitoring with Prometheus documentation: https://docs.akri.sh/user-guide/monitoring-with-prometheus
- Kubernetes Service and PodSpec references via Akri documentation links: https://kubernetes.io/docs/

## Issues Found
- Corrected the Akri architecture description from three CR types to the documented two CRDs: Configuration and Instance.
- Added `onvif.discovery.enabled=true` to the Helm install command because the post later uses ONVIF discovery.
- Changed "USB Cameras with ONVIF" to "IP Cameras with ONVIF" because ONVIF is used for network cameras, while USB devices are handled through udev.
- Replaced an ONVIF CIDR filter example with a specific IP address, matching Akri's documented `ipAddresses.items` shape.
- Removed invalid udev `hostPath` placeholder wiring. Akri injects udev device properties and mounts discovered device nodes through its device plugin behavior.
- Replaced the OPC UA `OPCUA_ENDPOINT` placeholder with `brokerProperties` and left device endpoint discovery to Akri's documented `OPCUA_DISCOVERY_URL_<INSTANCE_HASH>` environment variable behavior.
- Removed a nonexistent ConfigMap-based device endpoint example from the application Deployment. Akri injects device properties into pods that request Akri resources.
- Updated service access commands to derive the Instance and Service names dynamically and run curl from inside the cluster.
- Fixed the failover Deployment YAML by adding `template.metadata.labels` and matching Akri resource limits.
- Replaced the unsupported "device priority" annotation example with a technically accurate ONVIF include filter for targeting a specific device.
- Added the required `{{PLACEHOLDER}}` Akri resource request and limit to the scaling broker example so the Akri Controller can inject the discovered device resource.

## Review Notes
- `helm`, `kubectl`, and `ruby` were not installed in the local environment, so CLI help/output validation was not possible here.
- All embedded YAML snippets were parsed successfully with Python/PyYAML.
- The Python broker snippet compiles syntactically, but Flask/OpenCV dependencies were not installed or exercised.
