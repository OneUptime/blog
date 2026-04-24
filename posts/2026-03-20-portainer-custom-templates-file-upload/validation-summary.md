# Validation Summary: How to Create Custom Templates via File Upload in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer custom templates
- Docker Compose
- Mustache templating
- Portainer CE / Business Edition

## Sources Consulted
- Portainer documentation, "Custom templates": https://docs.portainer.io/user/docker/templates/custom
- Docker documentation, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation, "Compose file reference": https://docs.docker.com/reference/compose-file/
- Mustache manual, `mustache(5)`: https://mustache.github.io/mustache.5.html?lang=node%2Cpython
- Portainer source, custom template create view: https://github.com/portainer/portainer/blob/develop/app/react/portainer/templates/custom-templates/CreateView/InnerForm.tsx
- Portainer source, custom template variable handling: https://github.com/portainer/portainer/blob/develop/app/react/portainer/custom-templates/components/utils.ts
- Portainer source, common fields and selectors: https://github.com/portainer/portainer/blob/develop/app/react/portainer/custom-templates/components/CommonFields.tsx
- Portainer source, template type selector: https://github.com/portainer/portainer/blob/develop/app/react/portainer/custom-templates/components/TemplateTypeSelector.tsx
- Portainer source, platform selector: https://github.com/portainer/portainer/blob/develop/app/react/portainer/custom-templates/components/PlatformSelector.tsx
- Portainer source, file upload field: https://github.com/portainer/portainer/blob/develop/app/react/components/form-components/FileUpload/FileUploadForm.tsx
- Portainer source, uploaded custom template storage and create-file handler: https://github.com/portainer/portainer/blob/develop/api/filesystem/filesystem.go
- Portainer source, uploaded custom template create handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/customtemplates/customtemplate_create.go

## Issues Found
- The post used the wrong Portainer navigation and metadata fields. I changed `App Templates > Custom templates` to `Templates > Custom`, updated the create button label, replaced the nonexistent `Categories` field with `Note`, changed `Type: Stack` to `Type: Standalone / Podman`, and normalized `Platform` / `Logo` to match current Portainer docs and source.
- The Compose examples used unsupported variable syntax like `{{ .version | default "latest" }}`. Portainer custom templates use Mustache variable tags such as `{{ version }}` and defaults are configured in the variable definitions UI, so I rewrote the examples accordingly.
- The article implied template variables were generally available in CE and BE. Portainer’s docs and source show custom-template variable support is a Portainer Business Edition feature, so I added that requirement where variables are introduced and configured.
- The upload workflow description was inaccurate. The draft said the upload method supports drag-and-drop and loads the Compose file into the editor for review during template creation. Current Portainer docs and source show the upload flow is file selection only, with the filename shown in the upload field, so I corrected Steps 4 and 5.
- The sample metadata and testing flow implied a variable-only deployment form. I updated the validation/test steps to reflect the actual deployment form, which requires a stack name and optionally exposes template variables when configured.
- The "production-ready" example included an obsolete top-level Compose `version` field and a relative bind mount for `./nginx.conf`, which is not appropriate for a single-file upload example because the supporting file is not uploaded with the template. I removed the obsolete `version` key, removed the unsupported bind mount, and adjusted quoting so the rendered Compose stays valid.
- The draft said the template is saved to Portainer’s database. Portainer stores uploaded custom template content internally, including writing the uploaded file into its file store, so I replaced that with neutral wording that is accurate without overstating the storage implementation.
- The migration section recommended deleting the original hardcoded Compose file immediately. Because the same post notes there is no version history in Portainer for this method, I changed that guidance to retire or archive the source file only after validating the template.

## Review Notes
- The tutorial is now technically accurate for Portainer’s current Docker custom-template flow as documented in Portainer 2.39 LTS and reflected in the current official source.
- In Portainer CE, the upload method still works for static custom templates, but the variable-definition workflow shown in the article requires Portainer Business Edition.
- Relative-path companion files are better suited to the Git repository method than the file-upload method, because file upload only provides the Compose file itself.
