import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMockRoom, linkMockRooms } from "@baditaflorin/mesh-common/testing";
import { Feature } from "../../src/Feature";
import { config } from "../../src/config";

afterEach(cleanup);

describe("Feature — replaying a deck", () => {
  it("does not resurrect a previous round's votes for the same card index", () => {
    const room = createMockRoom({ peerId: "p1" });

    // Simulate a *previous* playthrough of the "most-likely" deck: p1 voted
    // for p2 on card index 0, using the buggy pre-fix key shape
    // `ml:v:<deck>:<idx>` (no seed component).
    room.doc.getMap("__mesh_roster").set("p1", Date.now());
    room.doc.getMap("__mesh_roster").set("p2", Date.now());
    room.doc.getMap("__mesh_names").set("p1", "Alex");
    room.doc.getMap("__mesh_names").set("p2", "Sam");
    room.doc.getMap("ml:v:most-likely:0").set("p1", "p2");

    render(<Feature room={room} config={config} />);

    // Start a brand-new "most-likely" game from the lobby — a fresh seed is
    // drawn, and the room should land on a clean, unvoted card index 0.
    const deckButton = screen.getByRole("button", { name: /most likely to/i });
    fireEvent.click(deckButton);

    // With the fix, the vote key includes the seed, so this fresh round's
    // card 0 must not already show "1 / 2 voted" or a pre-picked option —
    // that data belongs to the previous playthrough's card 0.
    expect(screen.getByText("0 / 2 voted")).toBeInTheDocument();
    const samButton = screen.getByRole("button", { name: /^Sam$/ });
    expect(samButton.className).not.toMatch(/is-picked/);
  });
});

describe("Feature — reveal verdict vs leaderboard consistency", () => {
  it("does not crown a peer who is no longer present in the room", () => {
    // Two real peers, CRDT-linked exactly like two browser tabs in the same
    // room. We drive the actual app code (no hand-authored Yjs keys) so this
    // test doesn't depend on the internal vote-key format.
    const roomA = createMockRoom({ peerId: "p1" });
    const roomB = createMockRoom({ peerId: "ghost" });
    const unlink = linkMockRooms(roomA, roomB);

    roomA.doc.getMap("__mesh_names").set("p1", "Alex");
    roomB.doc.getMap("__mesh_names").set("ghost", "Ghost");

    const containerA = document.createElement("div");
    const containerB = document.createElement("div");
    document.body.append(containerA, containerB);
    const viewA = render(<Feature room={roomA} config={config} />, { container: containerA });
    const viewB = render(<Feature room={roomB} config={config} />, { container: containerB });

    // Both tabs pick the "most-likely" deck; whichever click lands starts
    // the shared round (both docs converge via the link).
    fireEvent.click(within(containerA).getAllByRole("button", { name: /most likely to/i })[0]!);

    // "ghost" votes for itself while it is still a normal, present peer.
    fireEvent.click(within(containerB).getByRole("button", { name: /^Ghost/ }));

    // Now "ghost" disconnects for good (tab closed / lost forever) — its
    // heartbeat stops, so it ages out of the roster's `present` set. Its
    // vote entry, however, is never pruned from the shared vote map — that
    // is the crux of the bug under test.
    roomA.doc.getMap("__mesh_roster").delete("ghost");
    viewB.unmount();
    containerB.remove();

    fireEvent.click(within(containerA).getByRole("button", { name: /reveal/i }));

    // The verdict line must not crown a peer who no longer appears anywhere
    // in the room (roster or leaderboard). With only "ghost" having voted,
    // and "ghost" no longer present, there is no eligible winner left.
    expect(within(containerA).getByText("No votes yet.")).toBeInTheDocument();
    expect(within(containerA).queryByText(/most likely to.*👑/)).not.toBeInTheDocument();
    expect(within(containerA).queryByText(/Ghost/)).not.toBeInTheDocument();

    viewA.unmount();
    containerA.remove();
    unlink();
  });
});
