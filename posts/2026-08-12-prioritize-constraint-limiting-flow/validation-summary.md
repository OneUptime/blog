# Validation Summary: Too Many Improvement Ideas, Too Little Time: Prioritizing the Constraint That Actually Limits Flow

## Status
validated

## Post Type
Technical process guide

## Technologies Covered

- Theory of Constraints (TOC)
- Lean value-stream management
- Kanban and work-in-progress controls
- DORA software-delivery practices
- Flow metrics: WIP, throughput, work item age, cycle time, queue time, and active time
- YAML-formatted illustrative experiment definitions

## Sources Consulted

- [DORA: Work in process limits](https://dora.dev/capabilities/wip-limits/)
- [DORA: Working in small batches](https://dora.dev/capabilities/working-in-small-batches/)
- [The Kanban Guide, May 2025](https://kanbanguides.org/the-kanban-guide/)
- [Open Guide to Kanban, July 2025](https://kanbanguides.org/open-guide-to-kanban/2025.7/)
- [Theory of Constraints International Certification Organization: Introduction to the Theory of Constraints](https://learningcenter.tocico.org/courses/Introduction-to-the-Theory-of-Constraints)
- [Lean Enterprise Institute: Theory of Constraints and Lean Thinking](https://www.lean.org/the-lean-post/articles/what-is-the-theory-of-constraints-and-how-does-it-compare-to-lean-thinking/)
- [Lean Enterprise Institute: Lean Operations](https://www.lean.org/explore-lean/operations/)
- [Lean Enterprise Institute: The Five Steps of Lean Implementation](https://www.lean.org/the-lean-post/articles/the-five-steps-of-lean-implementation/)
- [Journal of Operations Management: Justice in Time: A Theory of Constraints Approach](https://onlinelibrary.wiley.com/doi/10.1002/joom.1234)

## Issues Found

- The bottleneck definition excluded the boundary case where effective capacity equals demand. Changed "lower than demand" to "at or below demand" to match the standard TOC definition.
- The statement that constraint movement is how system improvement manifests was too categorical. Changed it to say constraint movement is one way improvement manifests, because an improvement can help without breaking the current constraint.
- The conclusion stated that any working improvement moves the constraint. Made the statement conditional on the improvement breaking the current constraint, consistent with the fifth TOC focusing step.

## Review Notes

- Both YAML snippets are syntactically valid and are clearly illustrative rather than schemas for a specific tool.
- The current Kanban Guide requires explicit WIP control, which can be implemented with a numeric limit or another explicit control. The post's use of WIP limits is a valid concrete implementation.
- All links in the post resolved successfully during validation. The Kanban Guide was current at version 2025.5, and the Open Guide to Kanban was current at version 2025.7.
