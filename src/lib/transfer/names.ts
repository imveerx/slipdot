const LEFT = [
  "Amber",
  "Quiet",
  "Brisk",
  "Cedar",
  "Lunar",
  "Copper",
  "Gentle",
  "Rapid",
  "Misty",
  "Solar",
  "Velvet",
  "Crisp",
  "Hidden",
  "Noble",
  "Bright",
  "Silver",
  "Calm",
  "Wild",
  "Tiny",
  "Bold",
];

const RIGHT = [
  "Harbor",
  "Finch",
  "Pebble",
  "Lantern",
  "Meadow",
  "Quartz",
  "Willow",
  "Comet",
  "Brook",
  "Maple",
  "Heron",
  "Cinder",
  "Prairie",
  "Orbit",
  "Thistle",
  "Marble",
  "Falcon",
  "Dune",
  "Iris",
  "Nimbus",
];

const GENERIC = /^(phone|computer|this device|device|laptop|desktop|mobile)$/i;

export function randomDeviceName(): string {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  return `${LEFT[bytes[0] % LEFT.length]} ${RIGHT[bytes[1] % RIGHT.length]}`;
}

export function storedDeviceName(): string {
  const saved = localStorage.getItem("slip-name")?.trim() ?? "";
  if (saved && !GENERIC.test(saved)) return saved.slice(0, 24);
  const next = randomDeviceName();
  localStorage.setItem("slip-name", next);
  return next;
}
