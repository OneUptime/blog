# Validation Summary: How to Use Template Variables with Mustache Syntax in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer custom templates
- Docker Compose
- Mustache templating
- YAML

## Sources Consulted
- Portainer custom templates documentation: https://docs.portainer.io/user/docker/templates/custom
- Portainer source: `app/react/portainer/custom-templates/components/utils.ts`: https://github.com/portainer/portainer/blob/742523d/app/react/portainer/custom-templates/components/utils.ts
- Portainer source: `app/react/portainer/custom-templates/components/CustomTemplatesVariablesDefinitionField/CustomTemplatesVariablesDefinitionField.tsx`: https://github.com/portainer/portainer/blob/742523d/app/react/portainer/custom-templates/components/CustomTemplatesVariablesDefinitionField/CustomTemplatesVariablesDefinitionField.tsx
- Portainer source: `app/react/portainer/custom-templates/components/CustomTemplatesVariablesField/getDefaultValues.ts`: https://github.com/portainer/portainer/blob/742523d/app/react/portainer/custom-templates/components/CustomTemplatesVariablesField/getDefaultValues.ts
- Portainer source: `app/react/portainer/custom-templates/components/CustomTemplatesVariablesField/validation.tsx`: https://github.com/portainer/portainer/blob/742523d/app/react/portainer/custom-templates/components/CustomTemplatesVariablesField/validation.tsx
- Portainer source: `app/react/portainer/templates/custom-templates/ListView/StackFromCustomTemplateFormWidget/DeployForm.tsx`: https://github.com/portainer/portainer/blob/742523d/app/react/portainer/templates/custom-templates/ListView/StackFromCustomTemplateFormWidget/DeployForm.tsx
- Mustache manual: https://mustache.github.io/mustache.5.html
- mustache.js README: https://github.com/janl/mustache.js

## Issues Found
- The post described Portainer custom template variables as using Go-template-style dotted names and an inline `default` filter. Portainer's current implementation parses and renders plain Mustache variables, and defaults are configured separately in the template variable definitions. I replaced all unsupported inline-default examples with `{{ variable_name }}` placeholders and moved the default guidance to the Variables section.
- The prerequisites implied Portainer CE or BE was sufficient for template variables. Portainer's official documentation states template variables for custom templates are a Business Edition feature. I corrected the prerequisite accordingly.
- The Variables JSON example used `default` as the field name. Portainer's variable definition model uses `defaultValue`. I updated the example to match the current API/UI model.
- The post claimed defaults appear as placeholders in the deploy form. Portainer currently pre-populates variable inputs with their default values. I corrected that behavior description.
- The limitations section asserted unsupported syntax details that do not match Portainer's current documented behavior. I rewrote that section to avoid inaccurate claims and to reflect the documented/simple substitution workflow.

## Review Notes
- Portainer's official docs document custom template variables as `{{ }}` placeholders and the current UI is built around simple variable substitution with separately defined labels, descriptions, and default values.
- The WordPress example still uses a Compose `version` field. This remains broadly compatible, but modern Compose tooling treats the `version` key as optional.
