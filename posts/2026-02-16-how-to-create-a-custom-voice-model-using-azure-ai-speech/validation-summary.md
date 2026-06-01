# Validation Summary: How to Create a Custom Voice Model Using Azure AI Speech

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Speech
- Custom Neural Voice / professional voice fine-tuning
- Custom Voice Lite
- Azure Speech Studio
- Azure Custom Voice REST API
- Azure Speech SDK for Python
- SSML

## Sources Consulted
- Microsoft Learn: Custom voice overview - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-neural-voice
- Microsoft Learn: Professional voice fine-tuning data - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-custom-voice-training-data
- Microsoft Learn: Add a professional voice training dataset - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/professional-voice-create-training-set
- Microsoft Learn: Train your professional voice model - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/professional-voice-train-voice
- Microsoft Learn: Custom voice lite - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-neural-voice-lite
- Microsoft Learn: Custom Voice API reference - https://learn.microsoft.com/en-us/rest/api/speech/
- Microsoft Learn: Training Sets - Create - https://learn.microsoft.com/en-us/rest/api/aiservices/speechapi/training-sets/create?view=rest-aiservices-speechapi-2024-02-01-preview
- Microsoft Learn: Training Sets - Upload Data - https://learn.microsoft.com/en-us/rest/api/aiservices/speechapi/training-sets/upload-data?view=rest-aiservices-speechapi-2024-02-01-preview
- Microsoft Learn: Endpoints - Create - https://learn.microsoft.com/en-us/rest/api/aiservices/speechapi/endpoints/create?view=rest-aiservices-speechapi-2024-02-01-preview
- Microsoft Learn: Text to speech REST API - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech
- Microsoft Learn: How to synthesize speech from text - https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis

## Issues Found
- Corrected the description of model creation from training a completely new neural network to fine-tuning a neural text-to-speech model, matching Azure's current custom voice documentation.
- Updated the access approval timing from "a few business days" to "up to around 10 business days" based on Microsoft's Custom Voice Lite deployment guidance.
- Fixed the transcript format from pipe-separated lines to tab-separated lines, which is required for individual utterance transcripts.
- Updated the Speech Studio upload navigation from "Training data" to "Prepare training data".
- Replaced the incorrect `/texttospeech/datasets` REST API examples and `2024-04-01` API version with the current `/customvoice/trainingsets` create and upload flow using `2024-02-01-preview`.
- Reworked the upload example to use Azure Blob Storage content sources with a SAS URL, because the Custom Voice REST API upload operation accepts `audios` and `scripts` content source objects rather than a raw local ZIP upload.
- Corrected the training guidance: Custom Voice Lite is a separate Speech Studio-only demo/evaluation project type with 20-50 utterances, while professional voice fine-tuning uses 300-2000 utterances and current training methods such as Neural, Neural HD Voice, multilingual, multi style, and cross lingual.
- Updated training time guidance from the older 20-40 hour framing to the current professional voice fine-tuning average of about 10 compute hours.
- Fixed the endpoint deployment REST example to use `PUT /customvoice/endpoints/{id}` with a UUID endpoint ID, `projectId`, `modelId`, and `2024-02-01-preview`.
- Clarified that Speech SDK usage requires both the custom endpoint ID and custom voice name.
- Made the SSML expression example valid as a standalone Python snippet and changed style switching to be optional, because SSML style switching only applies when the model was trained with multiple styles.
- Updated cost optimization guidance to recommend suspending endpoints when not in use rather than implying deployment must be deleted or recreated.

## Review Notes
The code examples are syntactically valid Python, but they still use placeholder Azure resource IDs, keys, Blob Storage SAS URLs, and voice names. The REST API version referenced is currently a preview API in Microsoft documentation, so the examples should be rechecked if Azure publishes a newer stable custom voice management API.
