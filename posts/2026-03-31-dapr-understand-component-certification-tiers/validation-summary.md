# Validation Summary: How to Understand Dapr Component Certification Levels

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr components-contrib repository
- Dapr component certification lifecycle
- Dapr conformance and certification tests
- Go testing framework (for conformance tests)

## Sources Consulted
- Dapr Certification Lifecycle documentation: https://docs.dapr.io/operations/components/certification-lifecycle/
- Dapr Supported State Stores reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr Component Schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr components-contrib conformance tests README: https://github.com/dapr/components-contrib/blob/main/tests/conformance/README.md
- Dapr components-contrib state directory: https://github.com/dapr/components-contrib/tree/main/state

## Issues Found

1. **Wrong terminology throughout**: The post used "certification tiers" but Dapr officially uses "certification levels" and "certification lifecycle." Changed all occurrences of "tiers" to "levels" and "tier system" to "certification lifecycle."

2. **Alpha definition inaccuracies**: The original claimed Alpha components "May have incomplete feature implementation" — the docs actually say they implement the required interface and work as described but might be buggy. Also removed the fabricated claim that Alpha components "May be removed if maintenance is abandoned," which is not stated in Dapr docs.

3. **Beta definition inaccuracies**: Removed the fabricated claim "Have at least one maintainer actively responding to issues" — not stated in official docs for Beta. Corrected that Beta components "must pass all component conformance tests" (stronger than "have functional automated tests"). Aligned the production-use language to match docs ("recommended for only non-business-critical uses").

4. **Stable definition — multiple fabrications fixed**:
   - Changed "Pass the full Dapr component conformance test suite" to "Pass the full Dapr component certification tests, which validate functionality and resiliency" (certification tests are distinct from and beyond conformance tests).
   - Removed fabricated claim "Have comprehensive documentation including all metadata fields" (not a stated requirement).
   - Removed fabricated claim "Guarantee no breaking spec changes without deprecation notices" (not stated in docs).
   - Changed "Have multiple maintainers and active community support" to "Have a maintainer who addresses issues" (docs say singular maintainer, not multiple).
   - Added the missing requirement that components must have been Alpha or Beta for at least one minor version release.

5. **Conformance test command was wrong**: Changed `go test ./tests/conformance/... -tags=<component>` to `go test -v -tags=conftests -count=1 ./tests/conformance -run="TestStateConformance/redis"`. The build tag is `conftests` (not the component name), component selection uses `-run` flag, the path has no `...` suffix, and `-v` and `-count=1` flags are standard.

6. **state.cassandra incorrectly labeled as Alpha**: Apache Cassandra state store is actually Stable (since component version v1, runtime version 1.9). Replaced with `state.rethinkdb` as the Alpha example.

7. **Certification status location was wrong**: The post claimed to "look for the certification badge at the top of each component page." There is no badge — the status is shown in a table column on component reference listing pages. Corrected the description.

8. **Unverifiable claim about component READMEs**: The claim that "The README for each component folder indicates its certification tier" could not be verified. Replaced with a neutral factual statement.

## Review Notes
- The component spec YAML fragments shown (`spec.type` and `spec.version`) are correct but are incomplete — they omit the required `apiVersion`, `kind`, `metadata`, and `spec.metadata` fields. This is acceptable for illustrative purposes but readers should know a full component YAML is more involved.
- The choice of `state.rethinkdb` as the Alpha example should be periodically verified, as component certification levels can change between Dapr releases.
