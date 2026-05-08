# Validation Summary: How to Understand Cilium Governance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CNCF
- Open source governance
- GitHub repositories
- Mermaid diagrams

## Sources Consulted
- Cilium governance document: https://github.com/cilium/community/blob/main/GOVERNANCE.md
- Cilium contributor ladder: https://github.com/cilium/community/blob/main/CONTRIBUTOR-LADDER.md
- Cilium maintainers list: https://github.com/cilium/cilium/blob/main/MAINTAINERS.md
- Cilium Code of Conduct: https://github.com/cilium/cilium/blob/main/CODE_OF_CONDUCT.md
- Cilium community meetings documentation: https://docs.cilium.io/en/stable/community/community/
- CNCF Cilium project page: https://www.cncf.io/projects/cilium/
- Cisco acquisition announcement for Isovalent: https://newsroom.cisco.com/c/r/newsroom/en/us/a/y2024/m04/cisco-completes-acquisition-of-isovalent-to-define-the-future-of-multicloud-networking-and-security.html

## Issues Found
- The post described a separate "Maintainer (Core Team)" role. Current Cilium governance defines Community Contributor, Organization Member, Reviewer, Sub-Project Committer, and Committer roles; Cilium committers receive CNCF maintainer status. Updated the role description to match the official contributor ladder and governance document.
- The decision-making diagram said unresolved matters go to a "Core team vote" and that a majority decides. Official governance uses committer voting, with thresholds depending on the decision type: simple majority for general voting, majority yes votes with zero no votes for granting commit access, and two-thirds yes votes for some governance changes or revocation cases. Updated the diagram text to avoid an incorrect universal rule.
- The CNCF relationship section said code and project assets are owned by CNCF. That was too broad and not supported by the reviewed governance sources. Updated it to say Cilium is hosted by CNCF as a graduated project and can use CNCF project services.
- The governance document location was described as `/GOVERNANCE.md` in the Cilium GitHub repository. The current governance document is in the `cilium/community` repository, while the `cilium/cilium` repository links to it from `MAINTAINERS.md`. Updated this wording.
- The post said governance changes require a pull request and discussion. Official governance describes discussion followed by a formal committer vote for non-editorial policy changes, while editorial changes can use lazy consensus. Updated this wording.
- The Code of Conduct section said reports can be made to CNCF. Cilium's Code of Conduct is based on CNCF's Code of Conduct but includes Cilium-specific reporting details. Updated the text to mention the Cilium code of conduct team and the CNCF process where applicable.

## Review Notes
The `cat MAINTAINERS.md` command is valid when run from the root of the `cilium/cilium` repository, and the GitHub URL for the maintainers file is correct. The Mermaid flowchart syntax is valid after the wording correction.
