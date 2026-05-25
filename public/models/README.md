# Beacon 3D Model Slot

Put the exported Blender character here:

```text
public/models/beacon-rig.glb
```

The Beacon page automatically attempts to load that file. If it is missing, the
site uses the procedural Three.js stand-in from `src/scripts/beacon-3d.js`.

Recommended animation clips in the GLB:

- `Idle`
- `WalkIn`
- `Look`
- `Thinking`
- `Ready`
- `Wave`

Export from Blender as glTF Binary (`.glb`) with:

- Meshes
- Armature/bones
- Skinning
- Animation clips
- Materials
