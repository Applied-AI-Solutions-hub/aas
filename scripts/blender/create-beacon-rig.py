from pathlib import Path
import math

import bpy


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "models" / "beacon-rig.glb"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def mat(name, color, metallic=0.25, roughness=0.42, emission=None, strength=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
      bsdf.inputs["Emission Color"].default_value = emission
      bsdf.inputs["Emission Strength"].default_value = strength
    return material


def cube(name, location, scale, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("soft bevel", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 5
    obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj


def sphere(name, location, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    return obj


def add_key(obj, frame, loc=None, rot=None):
    bpy.context.scene.frame_set(frame)
    if loc is not None:
        obj.location = loc
        obj.keyframe_insert(data_path="location")
    if rot is not None:
        obj.rotation_euler = rot
        obj.keyframe_insert(data_path="rotation_euler")


def build():
    reset_scene()
    blue = mat("Beacon blue", (0.02, 0.18, 0.78, 1), 0.45, 0.28)
    dark = mat("Beacon graphite", (0.01, 0.025, 0.045, 1), 0.35, 0.5)
    glow = mat("Beacon cyan glow", (0.15, 0.85, 1, 1), 0.0, 0.18, (0.15, 0.85, 1, 1), 1.8)

    root = bpy.data.objects.new("Beacon_Rig_Root", None)
    bpy.context.collection.objects.link(root)

    body = cube("Body", (0, 0, 1.55), (0.48, 0.3, 0.68), blue)
    head = sphere("Head", (0, 0, 2.45), (0.42, 0.34, 0.42), dark)
    chest = cube("Chest_Logo", (0, -0.31, 1.68), (0.22, 0.025, 0.22), glow)
    eye_l = cube("Eye_L", (-0.14, -0.34, 2.5), (0.09, 0.018, 0.032), glow)
    eye_r = cube("Eye_R", (0.14, -0.34, 2.5), (0.09, 0.018, 0.032), glow)

    parts = [body, head, chest, eye_l, eye_r]
    for x in (-0.42, 0.42):
        parts.append(cube(f"UpperArm_{x}", (x, 0, 1.74), (0.09, 0.09, 0.34), blue))
        parts.append(cube(f"ForeArm_{x}", (x, 0, 1.18), (0.08, 0.08, 0.3), dark))
        parts.append(sphere(f"Hand_{x}", (x, 0, 0.82), (0.09, 0.09, 0.09), dark))
    for x in (-0.2, 0.2):
        parts.append(cube(f"Thigh_{x}", (x, 0, 0.86), (0.1, 0.1, 0.36), blue))
        parts.append(cube(f"Shin_{x}", (x, 0, 0.3), (0.09, 0.09, 0.34), dark))
        parts.append(cube(f"Foot_{x}", (x, -0.08, -0.1), (0.16, 0.28, 0.06), dark))

    for obj in parts:
        obj.parent = root

    bpy.ops.object.light_add(type="AREA", location=(-3, -4, 5))
    bpy.context.object.name = "Key_Light"
    bpy.context.object.data.energy = 450
    bpy.context.object.data.size = 4

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 96
    for frame in (1, 24, 48, 72, 96):
        phase = frame / 24
        add_key(root, frame, loc=(-1.8 + min(1, phase / 3) * 1.8, 0, math.sin(phase * math.pi * 2) * 0.05))
        add_key(head, frame, rot=(math.sin(phase * 1.3) * 0.05, 0, math.sin(phase * 1.1) * 0.04))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        export_animations=True,
        export_apply=True,
    )
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
