# Validation Summary: How to Configure Harvester Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Harvester load balancer
- Harvester IP pools
- Harvester Cloud Provider
- Kubernetes `Service` resources of type `LoadBalancer`
- KubeVirt virtual machines on Harvester

## Sources Consulted
- Harvester Load Balancer docs: https://docs.harvesterhci.io/v1.7/networking/loadbalancer/
- Harvester IP Pool docs: https://docs.harvesterhci.io/v1.7/networking/ippool/
- Harvester Cloud Provider docs: https://docs.harvesterhci.io/v1.7/rancher/cloud-provider/
- Harvester VM network docs: https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Official Harvester load balancer CRD and API source: https://github.com/harvester/load-balancer-harvester
- Official Harvester cloud provider source: https://github.com/harvester/cloud-provider-harvester

## Issues Found
- The VM load balancer examples used the wrong v1beta1 schema. I replaced `backendServers` entries with the supported `backendServerSelector`, added `workloadType: vm`, corrected `ipam` values to lowercase, and fixed `ipPool` to use the cluster-scoped IP pool name.
- The IP pool example was malformed. `IPPool` is cluster-scoped, not namespaced, and the original subnet/range/gateway values were inconsistent. I corrected the YAML to a valid cluster-scoped pool with a valid IPv4 range and selector structure.
- The guest-cluster service example used an unsupported `cloudprovider.harvesterhci.io/ip-pool-ref` annotation. I removed it and kept the supported `cloudprovider.harvesterhci.io/ipam: pool` annotation.
- The UI guidance omitted required configuration details for a functional VM load balancer. I added the required IPAM, IP pool, listener, selector, and health-check settings.
- The monitoring section claimed backend health details were available directly in LB status and used a `jsonpath` pipeline that would not produce valid JSON for `jq`. I updated the commands to inspect `.status` from full JSON output and corrected the status description.
- The blue-green deployment example patched an unsupported `backendServers` field. I updated it to patch `backendServerSelector`, which matches the current VM LB API.
- The post implied broader networking compatibility than Harvester currently supports. I added the required notes that VM LBs are not compatible with Kube-OVN overlay networks and that guest-cluster LBs are supported on VLAN networks, not Kube-OVN overlay networks.
- The architecture diagram labeled the VIP as a public IP, which is not guaranteed by Harvester. I corrected the label to simply `Load Balancer VIP`.

## Review Notes
- The IP pool example is written as a global pool so both the VM LB and guest-cluster examples can match it. Harvester allows only one global IP pool, so real deployments may need a more specific selector scope.
- Harvester Cloud Provider documentation notes that, starting with cloud provider v0.2.0, additional LB-specific health-check annotations for guest-cluster services are not necessary; readiness and liveness probes on workloads are preferred.
- Harvester's current narrative IP Pool docs show example YAML using `networking.harvesterhci.io/v1beta1`, while the official load-balancer controller source and CRDs use `loadbalancer.harvesterhci.io/v1beta1`. I aligned the post with the controller CRD and cloud-provider source because those define the resource schema actually used by the load balancer implementation.
