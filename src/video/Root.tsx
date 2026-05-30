import React from "react";
import {
  AbsoluteFill,
  Composition,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { registerRoot } from "remotion";

const scenes = [
  "Workflow Audit",
  "AI Roadmap",
  "Approval Gates",
  "Team Training",
];

const beaconSteps = [
  "Local memory",
  "Visible approvals",
  "Document work",
  "LightHouseOS path",
];

function AasWorkflowDemo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 18, stiffness: 90 } });
  const sweep = interpolate(frame, [0, 210], [-18, 118], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% -18%, rgba(255,46,159,.2), transparent 34%), linear-gradient(135deg, #000 0%, #0b0616 48%, #15082b 100%)",
        color: "#f7fbff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
          backgroundSize: "92px 92px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${sweep}%`,
          top: "-20%",
          width: "34%",
          height: "140%",
          transform: "rotate(18deg)",
          background:
            "linear-gradient(90deg, transparent, rgba(36,230,255,.22), rgba(255,46,159,.16), transparent)",
        }}
      />
      <div style={{ position: "absolute", left: 82, top: 76, width: 760 }}>
        <div
          style={{
            color: "#c9f8ff",
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: 0,
            textTransform: "uppercase",
          }}
        >
          Applied AI Solutions
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 72,
            lineHeight: 0.95,
            fontWeight: 820,
            transform: `translateY(${interpolate(progress, [0, 1], [28, 0])}px)`,
            opacity: progress,
          }}
        >
          Turn scattered work into an AI-ready operating system.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          bottom: 86,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 18,
        }}
      >
        {scenes.map((scene, index) => {
          const local = spring({
            frame: frame - index * 14,
            fps,
            config: { damping: 20, stiffness: 110 },
          });
          return (
            <div
              key={scene}
              style={{
                minHeight: 168,
                border: "1px solid rgba(218,237,247,.18)",
                borderRadius: 18,
                padding: 24,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.035))",
                transform: `translateY(${interpolate(local, [0, 1], [34, 0])}px)`,
                opacity: local,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  marginBottom: 34,
                  background:
                    index === 1
                      ? "#ff625f"
                      : index === 2
                        ? "#ff2e9f"
                        : "#24e6ff",
                }}
              />
              <div style={{ fontSize: 28, fontWeight: 760 }}>{scene}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

function BeaconAlphaDemo() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const intro = spring({ frame, fps, config: { damping: 18, stiffness: 92 } });
  const pulse = Math.sin(frame / 18) * 0.5 + 0.5;
  const scan = interpolate(frame, [0, 240], [-18, 118], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 48%, rgba(36,230,255,.18), transparent 34%), radial-gradient(circle at 42% 20%, rgba(255,46,159,.18), transparent 30%), linear-gradient(135deg, #000 0%, #080414 54%, #15082b 100%)",
        color: "#f7fbff",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.12,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)",
          backgroundSize: "86px 86px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${scan}%`,
          top: "-15%",
          width: "28%",
          height: "130%",
          transform: "rotate(16deg)",
          background:
            "linear-gradient(90deg, transparent, rgba(255,46,159,.2), rgba(36,230,255,.24), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 90,
          top: 78,
          right: 90,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#c9f8ff",
          fontSize: 28,
          fontWeight: 820,
          textTransform: "uppercase",
        }}
      >
        <span>Beacon Alpha Build</span>
        <span style={{ color: "#ff2e9f" }}>Local-first AI environment</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 108,
          top: 196,
          width: 470,
          height: 470,
          borderRadius: 235,
          border: "1px solid rgba(191,243,255,.24)",
          boxShadow: `0 0 ${50 + pulse * 42}px rgba(36,230,255,.18)`,
          transform: `scale(${interpolate(intro, [0, 1], [0.9, 1])})`,
          opacity: intro,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 62,
            borderRadius: 180,
            border: "1px solid rgba(255,46,159,.28)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 176,
            height: 176,
            borderRadius: 46,
            background:
              "linear-gradient(135deg, rgba(36,230,255,.96), rgba(255,46,159,.82))",
            boxShadow: "0 28px 90px rgba(36,230,255,.28)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -48%)",
            fontSize: 112,
            fontWeight: 900,
            color: "#03040a",
          }}
        >
          A
        </div>
      </div>
      <div style={{ position: "absolute", left: 650, top: 210, width: 520 }}>
        <div
          style={{
            fontSize: 78,
            lineHeight: 0.96,
            fontWeight: 860,
            transform: `translateY(${interpolate(intro, [0, 1], [24, 0])}px)`,
            opacity: intro,
          }}
        >
          An AI workstation your business controls.
        </div>
        <div
          style={{
            marginTop: 30,
            color: "#8f9aaa",
            fontSize: 30,
            lineHeight: 1.35,
          }}
        >
          Private memory, human approvals, workflow automation, and a path toward LightHouseOS.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 650,
          right: 88,
          bottom: 82,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
        }}
      >
        {beaconSteps.map((step, index) => {
          const local = spring({
            frame: frame - 20 - index * 12,
            fps,
            config: { damping: 20, stiffness: 110 },
          });
          return (
            <div
              key={step}
              style={{
                border: "1px solid rgba(218,237,247,.16)",
                borderRadius: 12,
                padding: "20px 22px",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03))",
                color: "#f7fbff",
                fontSize: 25,
                fontWeight: 760,
                opacity: local,
                transform: `translateY(${interpolate(local, [0, 1], [28, 0])}px)`,
              }}
            >
              {step}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="aas-workflow-demo"
        component={AasWorkflowDemo}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={800}
      />
      <Composition
        id="beacon-alpha-demo"
        component={BeaconAlphaDemo}
        durationInFrames={240}
        fps={30}
        width={1280}
        height={800}
      />
    </>
  );
}

registerRoot(RemotionRoot);
