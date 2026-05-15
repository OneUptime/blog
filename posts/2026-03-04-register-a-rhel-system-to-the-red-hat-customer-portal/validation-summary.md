# Validation Summary: How to Register a RHEL System to the Red Hat Customer Portal

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Subscription Management
- subscription-manager
- Red Hat CDN repositories
- DNF

## Sources Consulted
- Red Hat Documentation: Getting Started with RHEL System Registration - https://docs.redhat.com/en/documentation/subscription_central/1-latest/html-single/getting_started_with_rhel_system_registration/index
- Red Hat Documentation: Registering RHEL by using Subscription Manager - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/registering-rhel-by-using-subscription-manager_rhel-installer
- Red Hat Customer Portal: How to register and subscribe a RHEL system to the Red Hat Customer Portal using Red Hat Subscription-Manager? - https://access.redhat.com/solutions/253273
- Red Hat Documentation examples for enabling CodeReady Linux Builder on RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/installing_and_using_dynamic_programming_languages/red_hat_enterprise_linux-9-installing_and_using_dynamic_programming_languages-en-us.pdf

## Issues Found
- The auto-attach section presented `subscription-manager attach --auto` as a universal next step. Red Hat notes that Simple Content Access is now used broadly and systems do not need subscription attachment when SCA is enabled. Updated the section to make auto-attach conditional for organizations not using SCA and added the correct SCA behavior.
- The activation key text said activation keys are created in the Customer Portal. Current Red Hat documentation points users to the Red Hat Hybrid Cloud Console for activation keys and organization IDs. Updated the wording.
- The example `subscription-manager identity` output used non-hexadecimal characters in a UUID-style system identity. Replaced it with a valid UUID-style example.

## Review Notes
The `subscription-manager register`, activation key registration, repository listing, repository enable/disable, `subscription-manager identity`, `subscription-manager status`, `subscription-manager clean`, log inspection, and `dnf` usage are consistent with Red Hat documentation. Red Hat recommends RHC for a simplified registration experience on newer RHEL versions, but `subscription-manager` remains documented and valid for this workflow.
