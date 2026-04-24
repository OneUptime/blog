# Validation Summary: How Portainer OpenAMT Integration Worked (Deprecated)

## Status
validated

## Post Type
Reference

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Intel Active Management Technology (Intel AMT)
- OpenAMT / Open AMT Cloud Toolkit / Device Management Toolkit
- Intel vPro
- CIRA (Client Initiated Remote Access)
- OpenAMT RPS and MPS services

## Sources Consulted
- Portainer docs, "OpenAMT" - https://docs.portainer.io/user/home/openamt
- Portainer docs, "OpenAMT | 2.33 LTS" - https://docs.portainer.io/2.33-lts/user/home/openamt
- Portainer docs, "Edge Compute | 2.33 LTS" - https://docs.portainer.io/2.33-lts/admin/settings/edge
- Portainer docs, "Deprecated and removed features" - https://docs.portainer.io/advanced/deprecated
- Portainer release 2.36.0 STS - https://github.com/portainer/portainer/releases/tag/2.36.0
- Portainer source, OpenAMT activation handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/hostmanagement/openamt/amtactivation.go
- Portainer source, AMT RPC helper flow - https://github.com/portainer/portainer/blob/develop/api/http/handler/hostmanagement/openamt/amtrpc.go
- Portainer source, OpenAMT service implementation - https://github.com/portainer/portainer/blob/develop/api/hostmanagement/openamt/openamt.go
- Portainer source, OpenAMT CIRA configuration - https://github.com/portainer/portainer/blob/develop/api/hostmanagement/openamt/configCIRA.go
- Portainer source, OpenAMT domain configuration - https://github.com/portainer/portainer/blob/develop/api/hostmanagement/openamt/configDomain.go
- Portainer source, OpenAMT profile configuration - https://github.com/portainer/portainer/blob/develop/api/hostmanagement/openamt/configProfile.go
- Intel, "Getting Started with Intel Active Management Technology" - https://www.intel.com/content/www/us/en/developer/articles/guide/getting-started-with-active-management-technology.html
- Intel, "Intel Active Management Technology SDK Overview" - https://www.intel.com/content/www/us/en/developer/tools/active-management-technology-sdk/overview.html
- Intel, "What Features Does Intel Active Management Technology Include?" - https://www.intel.com/content/www/us/en/support/articles/000059506/technologies/intel-active-management-technology-intel-amt.html
- Intel security advisory INTEL-SA-00075 - https://www.intel.com/content/www/us/en/security-center/advisory/intel-sa-00075.html
- Device Management Toolkit (formerly Open AMT Cloud Toolkit) - https://github.com/device-management-toolkit/cloud-deployment
- Device Management Toolkit MPS - https://github.com/device-management-toolkit/mps
- Device Management Toolkit RPS - https://github.com/device-management-toolkit/rps

## Issues Found
- The post said the feature had already been removed. Current Portainer docs and release notes show OpenAMT was deprecated in Portainer 2.36.0 and is still marked for removal in a future release with `Remove: TBD`. Updated the description, introduction, and summary to reflect deprecation rather than completed removal.
- The post said Portainer showed Intel AMT within Edge environment settings. Official Portainer docs show OpenAMT configuration under `Settings > Edge Compute`, plus an `Associate with OpenAMT` workflow and device actions on the Home page. Updated the UI description accordingly.
- The post described the flow as network scanning via RPS. Portainer's docs and source show a different flow: administrators first deploy an Edge Agent, then use `Associate with OpenAMT`; Portainer configures domain/CIRA/profile data and launches an activation flow on the endpoint. Rewrote the numbered workflow steps to match the documented and implemented behavior.
- The architecture diagram implied Portainer simply connected to separate RPS and MPS servers and that RPS directly handled the device path shown. Portainer's source shows a more specific implementation: Portainer talks to RPS and MPS APIs, and activation is initiated from a helper container on the endpoint, after which MPS maintains the CIRA connection. Updated the diagram and component descriptions.
- The AMT overview overstated the hardware/power model by implying management worked even when powered off without qualification. Intel documentation requires the platform to still have power and network connectivity. Added that nuance and corrected "Disk redirection" to the official "Storage redirection" terminology.
- The deprecation section stated a definitive removal rationale and referenced the colloquial "Silent Bob" name. Portainer's public docs do not publish a formal rationale. Reworded the section to distinguish Portainer's documented deprecation from inferred practical limitations, and replaced the vulnerability reference with the official Intel advisory INTEL-SA-00075.
- The migration section implied the Portainer Edge Agent provided an equivalent remote console replacement for AMT. Portainer docs support the Edge Agent for remote container and workload management, but not hardware-level out-of-band power/KVM control. Updated that bullet to preserve the distinction.
- Corrected the product name `Pikvm` to `PiKVM`.

## Review Notes
- As of 2026-04-24, Portainer still documents OpenAMT as deprecated and "to be removed in a future release"; it should not be described as already removed unless Portainer later publishes a release or deprecation table update confirming that.
- The article is historical reference material rather than a how-to. The revised wording keeps that framing while aligning it with the currently documented deprecation state and the implementation details visible in Portainer's source.
