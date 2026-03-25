import { describe, it, expect } from "vitest";
import { routes } from "./routes";

describe("routes", () => {
  it("builds profile path for username", () => {
    expect(routes.profileUser("alice")).toBe("/profile/alice");
  });
});
