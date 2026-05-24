# Validation Summary: How to Create Kubernetes Services with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (~> 2.25)
- Kubernetes Services (ClusterIP, Headless, NodePort, LoadBalancer, ExternalName)
- Kubernetes Deployments
- Kubernetes Service annotations (AWS in-tree LB, GKE LB)
- Kubernetes DNS / kube-dns service discovery

## Sources Consulted
- Terraform Registry: `kubernetes_service_v1` resource docs — https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_v1
- HashiCorp Terraform Kubernetes provider source — https://github.com/hashicorp/terraform-provider-kubernetes
- Kubernetes Service documentation — https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods — https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- AWS legacy in-tree cloud provider service annotations
- GKE LoadBalancer service annotations documentation

## Issues Found
No technical issues found. Verified specifically:
- `spec.session_affinity_config.client_ip.timeout_seconds` is a valid nested block in provider 2.25+.
- `cluster_ip = "None"` is the correct way to declare a headless Service.
- `load_balancer_source_ranges` attribute name is correct (it is a Set of String, but list literal syntax in HCL works).
- `external_traffic_policy = "Local"` is a valid value.
- `node_port` is valid inside the `port` block; 30000-32767 is the upstream Kubernetes default range.
- `status[0].load_balancer[0].ingress[0].ip` is the correct accessor for the LB IP.
- `external_name` is the correct attribute for ExternalName services.
- DNS pattern `<service>.<namespace>.svc.cluster.local` is correct.
- AWS annotation `service.beta.kubernetes.io/aws-load-balancer-type = "nlb"` is correct for the legacy in-tree controller.
- GKE annotation `networking.gke.io/load-balancer-type = "Internal"` is correct.
- HCL syntax across all examples is valid (provider blocks, resource blocks, locals, outputs).

## Review Notes
- The AWS NLB annotation shown (`service.beta.kubernetes.io/aws-load-balancer-type: "nlb"`) is the legacy in-tree cloud-provider annotation. Newer clusters using the AWS Load Balancer Controller use `service.beta.kubernetes.io/aws-load-balancer-type: "external"` together with `service.beta.kubernetes.io/aws-load-balancer-nlb-target-type`. Both approaches are still in use depending on cluster setup; the post's example remains valid.
- The headless Service example uses a Deployment-style label selector. The DNS pattern `pod-0.database.data.svc.cluster.local` only yields per-pod hostnames when the backing workload is a StatefulSet (where each pod gets a stable hostname). The post does note "common with StatefulSets," which is accurate context.
- Provider version pin `~> 2.25` is reasonable; newer 2.x releases are backward compatible for the resources used here.
- `load_balancer_source_ranges` is internally a Set, not a List — practical impact is negligible since HCL list literals are accepted.
