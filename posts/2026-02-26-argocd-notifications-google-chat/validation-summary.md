# Validation Summary: How to Send ArgoCD Notifications to Google Chat

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes Secrets and ConfigMaps
- kubectl
- Google Chat incoming webhooks
- Google Chat Cards v2

## Sources Consulted
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications Google Chat service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/googlechat/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Google Chat incoming webhook documentation: https://developers.google.com/workspace/chat/quickstart/webhooks
- Google Chat message resource documentation: https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages
- Google Chat Cards v2 reference: https://developers.google.com/workspace/chat/api/reference/rest/v1/cards
- Google Chat message formatting documentation: https://developers.google.com/workspace/chat/format-messages
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The card examples used the legacy Google Chat `cards` field with `keyValue` and `textButton` widgets. Google marks `cards` as deprecated and recommends `cardsV2`, and Argo CD's Google Chat documentation also recommends `cardsV2`. Updated the deployment and failure card examples to use `cardsV2`, `decoratedText`, and `buttonList`.
- The "Using Cards v2 Format" section described Cards v2 as an additional newer option after legacy card examples. Updated the heading and wording so the post consistently presents Cards v2 as the current card format.
- The threaded messages section said threading was not directly supported and required capturing an initial message ID. Google Chat incoming webhooks support threading with `thread.threadKey` and `messageReplyOption`, and Argo CD's Google Chat service also supports thread keys. Updated the explanation to describe the supported thread-key approach.
- The debugging notes said invalid credentials meant the URL token expired. Google documents the webhook URL key and token as secret URL parameters, but not as expiring tokens. Updated the note to say the key or token is invalid.

## Review Notes
- The post uses Argo CD's generic webhook notification service rather than the native `googlechat` notification service. This is still technically valid for incoming webhooks, but a future revision could mention the native service as an alternative.
- `kubectl` was not installed in the local workspace, so CLI syntax was checked against official Kubernetes command references instead of local `--help` output.
- The Google Chat JSON message bodies were parsed successfully after substituting representative Argo CD template values.
