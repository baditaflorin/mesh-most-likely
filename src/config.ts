import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-most-likely",
  description:
    "Most-likely-to / never-have-I-ever / would-you-rather party decks with live mesh voting",
  accentHex: "#e0567c",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
