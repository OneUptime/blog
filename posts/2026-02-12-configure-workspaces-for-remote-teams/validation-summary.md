# Validation Summary: How to Configure WorkSpaces for Remote Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon WorkSpaces Personal
- Amazon WorkSpaces PCoIP and WSP/Amazon DCV protocols
- AWS CLI
- Boto3 for Python
- AWS Directory Service RADIUS MFA
- Active Directory Group Policy
- Amazon CloudWatch metrics
- PowerShell

## Sources Consulted
- AWS CLI Command Reference: create-workspaces - https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/workspaces/create-workspaces.html
- AWS CLI Command Reference: modify-streaming-properties - https://docs.aws.amazon.com/en_us/cli/latest/reference/workspaces/modify-streaming-properties.html
- AWS CLI Command Reference: modify-workspace-access-properties - https://docs.aws.amazon.com/en_us/cli/latest/reference/workspaces/modify-workspace-access-properties.html
- AWS CLI Command Reference: modify-selfservice-permissions - https://docs.aws.amazon.com/cli/latest/reference/workspaces/modify-selfservice-permissions.html
- AWS CLI Command Reference: enable-radius - https://awscli.amazonaws.com/v2/documentation/api/2.0.34/reference/ds/enable-radius.html
- Boto3 WorkSpaces create_workspaces reference - https://docs.aws.amazon.com/boto3/latest/reference/services/workspaces/client/create_workspaces.html
- Boto3 WorkSpaces describe_workspaces_connection_status reference - https://docs.aws.amazon.com/boto3/latest/reference/services/workspaces/client/describe_workspaces_connection_status.html
- Amazon WorkSpaces Administration Guide: Group Policy for Windows WorkSpaces - https://docs.aws.amazon.com/workspaces/latest/adminguide/group_policy.html
- Amazon WorkSpaces Administration Guide: CloudWatch metrics - https://docs.aws.amazon.com/workspaces/latest/adminguide/cloudwatch-metrics.html
- Amazon WorkSpaces User Guide: Windows client application - https://docs.aws.amazon.com/workspaces/latest/userguide/amazon-workspaces-windows-client.html
- AWS What's New: WorkSpaces WSP/DCV desktop traffic over TCP/UDP port 443 - https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-workspaces-wsp-desktop-traffic-tcp-udp-port-443/

## Issues Found
- Several placeholder resource IDs did not match AWS documented ID patterns. Updated directory, bundle, and WorkSpace placeholders to valid-looking values such as `d-926722edaf`, `wsb-0a1b2c3d4`, and `ws-0a1b2c3d4`.
- The protocol section used only the older WSP name. Updated the wording to note that AWS now refers to WSP as Amazon DCV while preserving the post's WSP framing.
- The bandwidth optimization command used `modify-workspace-properties` to set compute type, which is not a streaming optimization. Replaced it with `modify-streaming-properties` using `StreamingExperiencePreferredProtocol`.
- The Windows client registry example referenced an unsupported `MaxFrameRate` key. Replaced it with documented WorkSpaces client display guidance and the documented `EnableHwAcc` registry value.
- The time zone Group Policy path omitted the WSP node. Updated it to `Computer Configuration > Administrative Templates > Amazon > WSP`.
- The redirection snippet referred to drive redirection, but current WorkSpaces docs describe file transfer and clipboard/printing controls. Updated the wording to file transfer.
- The PowerShell example attempted to set the Windows default browser by editing the protected `UserChoice` registry key. Removed that unsupported registry edit from the snippet.
- The monitoring script read `LastKnownUserConnectionTimestamp` from `describe_workspaces`, but that field is returned by `describe_workspaces_connection_status`. Updated the script to call the correct API and batch WorkSpace IDs in groups of 25.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI verification was performed against official AWS CLI documentation rather than local `aws --help` output. Python snippets were syntax-checked with `python3`.
