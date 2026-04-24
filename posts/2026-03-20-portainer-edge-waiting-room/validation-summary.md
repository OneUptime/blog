# Validation Summary: How to Use the Edge Environment Waiting Room in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Compute and Edge Agent auto-onboarding
- Portainer HTTP API
- Bash
- Python 3
- `curl`

## Sources Consulted
- Portainer docs, Waiting Room: https://docs.portainer.io/user/edge/waiting-room
- Portainer docs, API documentation entrypoint: https://docs.portainer.io/api/docs
- Portainer docs, Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer API spec (Business Edition 2.39.1): https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Official Portainer source, waiting room sidebar location: https://github.com/portainer/portainer/blob/develop/app/react/sidebar/EdgeComputeSidebar.tsx
- Official Portainer source, waiting room table columns: https://github.com/portainer/portainer/blob/develop/app/react/edge/edge-devices/WaitingRoomView/Datatable/columns.ts
- Official Portainer source, waiting room UI actions: https://github.com/portainer/portainer/blob/develop/app/react/edge/edge-devices/WaitingRoomView/Datatable/TableActions.tsx
- Official Portainer source, waiting room settings wording: https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/EdgeComputeView/AutomaticEdgeEnvCreation/EnableWaitingRoomSwitch.tsx

## Issues Found
- The post described the waiting room as a generic Portainer feature under **Environments**. I corrected this to match current Portainer behavior: the Waiting Room is a Portainer Business Edition feature shown under **Edge compute** when Edge Compute is enabled and the waiting room is turned on.
- The UI terminology was outdated. I changed "approve" to "associate" and updated the button label to **Associate Device**, which matches current Portainer UI and docs.
- The list of waiting-room fields was inaccurate. I replaced `IP Address` and `First Seen` with the fields Portainer currently exposes in the waiting room UI: `Name`, `Edge ID`, `Edge Groups`, `Group`, `Tags`, and `Last Check-in`.
- The API examples used incorrect endpoints (`/api/edge/waiting-room` and `/api/edge/waiting-room/approve`) and incorrect response fields (`EndpointID`, `LastCheckInIP`). I replaced them with the current documented API usage: listing untrusted Edge environments through `/api/endpoints?edgeDeviceUntrusted=true&types=4,7&excludeSnapshots=true` and associating them through `/api/endpoints/edge/trust`.
- The "approve by IP prefix" automation example relied on a field that is not present in the current endpoint schema. I replaced it with an `EdgeID`-based filter using the documented `EdgeID` field.
- The "skip the waiting room" section referenced a non-existent **Auto-approve edge devices** toggle. I corrected this to disabling **Enable Edge Environment Waiting Room** and saving the settings.
- The removal example previously implied a permanent rejection. I updated the wording to match current Portainer behavior more closely: removing an item hides it from the waiting room until the Edge Agent starts again.

## Review Notes
- Portainer's official materials currently show both JWT-based auth and API-key auth in different places. The updated post uses API keys because the user-facing API access docs explicitly document access tokens with the `X-API-Key` header, while the OpenAPI spec also accepts API-key authentication.
- The current waiting-room API behavior is modeled through the environments/endpoints API plus the Edge trust endpoint, not a dedicated `/api/edge/waiting-room` resource.
