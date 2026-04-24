# Validation Summary: Portainer vs CasaOS: Home Server OS Comparison - Home Server

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Portainer
- CasaOS
- ZimaOS
- Docker
- Docker Compose
- Kubernetes
- Home server / self-hosting

## Sources Consulted
- Portainer documentation overview: https://docs.portainer.io/
- Portainer app templates: https://docs.portainer.io/user/docker/templates/application
- Portainer stacks: https://docs.portainer.io/user/docker/stacks
- Portainer environment management: https://docs.portainer.io/sts/admin/environments
- Portainer Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer roles (Business Edition RBAC): https://docs.portainer.io/sts/admin/user/roles
- CasaOS official site: https://casaos.zimaspace.com/
- CasaOS official GitHub README: https://github.com/IceWhaleTech/CasaOS
- CasaOS AppStore repository: https://github.com/IceWhaleTech/CasaOS-AppStore
- CasaOS AppStore Portainer entry: https://github.com/IceWhaleTech/CasaOS-AppStore/tree/main/Apps/Portainer
- ZimaOS getting started docs: https://www.zimaspace.com/docs/zimaos/get-started

## Issues Found
- The intro implied both products simply "run on top of Linux and Docker". I corrected this to reflect that, while that is a common home-server deployment pattern, Portainer also officially supports Docker Swarm and Kubernetes.
- The comparison table used unsupported hard resource-usage numbers (`~100MB` and `~200MB`). I removed that row because it was not backed by official documentation and would vary by deployment.
- The comparison table described CasaOS generically as having "NAS features". I narrowed this to "Drive management" so the table reflects the storage and file-management capabilities that are explicitly documented.
- The Portainer app-store wording was made more precise by changing "Template library" to "App templates", which matches Portainer's official terminology.
- The Docker Compose comparison overstated Portainer with "Full" and understated CasaOS with "Limited". I changed this to "Advanced stack management" for Portainer and "Compose-based apps" for CasaOS to better match the official products and avoid overclaiming Compose parity.
- CasaOS was described as "the home cloud OS", which does not match the current official positioning. I updated this to "personal cloud OS" to align with CasaOS's current official wording.
- The ZimaOS note was vague. I corrected it to state that ZimaOS is developed based on CasaOS and is positioned toward NAS-like hardware and workflows.
- The Portainer comparison bullets implied RBAC generally, without edition context. I clarified that RBAC is a Business Edition feature, while multi-user access is still a valid Portainer advantage.
- The summary claimed Portainer gives users "full control". I narrowed this to "more control over stacks and environments" to keep the conclusion technically accurate.

## Review Notes
- Portainer has strong stack support, but some Compose scenarios have documented limitations, so avoiding blanket "full Docker Compose" wording was more accurate.
- CasaOS remains installable from its official installer, but the official site now prominently directs users toward ZimaOS. The post is still technically relevant, but that product evolution is worth keeping in mind for future updates.
