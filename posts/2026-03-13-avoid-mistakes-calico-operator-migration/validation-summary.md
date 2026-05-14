# Validation Summary: How to Avoid Common Mistakes with Calico Operator Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- calicoctl
- kubectl
- Calico IPPool and FelixConfiguration resources

## Sources Consulted
- Calico documentation: Migrate Calico to an operator-managed installation, https://docs.tigera.io/calico/latest/operations/operator-migration
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration

## Issues Found
- The initial migration command example used `kubectl create -f tigera-operator.yaml`. Current Calico migration docs install the Tigera Operator with server-side apply; the example was updated to use `kubectl apply --server-side --force-conflicts`.
- The encapsulation mistake example included `encapsulation: IPIP` while labeling the block as wrong. `IPIP` is a valid Installation `encapsulation` value; the incorrect field was `ipipMode` in an Installation IP pool. The example was corrected to focus on the unsupported field.
- The maintenance-window section claimed a fixed 10-30 second interruption per node and derived a migration duration from that value. Official docs do not guarantee that timing. The section was revised to state the documented migration behavior and the documented risk that switching encapsulation modes can disrupt in-progress connections.
- The `nodeSelector` section claimed `nodeSelector` is required and that omitting it causes new default pools. The Installation API documents `nodeSelector` as optional with default `all()`. The section was changed to recommend explicitly checking or setting it when preserving pool scope.
- The FelixConfiguration section claimed custom settings are not automatically migrated. Official migration docs state that supported customizations are maintained and unsupported ones are warned about. The section was changed to require post-migration validation and explicit reapplication only for missing supported settings.

## Review Notes
The post is version-sensitive. Current Calico documentation reviewed was Calico Open Source 3.32, where operator migration is supported only from a matching 3.32 manifest-based installation and uses the Kubernetes datastore.
