// Fabric Check — fibre data and currency rates

const FIBRES = {
  cashmere: { name: "Cashmere", aliases: ["cashmere"], score: 10, tier: "Luxury", oneLiner: "ultra-soft, super warm, the real luxury stuff", care: "Hand wash cold, dry flat", careRank: 2 },
  silk: { name: "Silk", aliases: ["silk", "mulberry silk"], score: 9, tier: "Luxury", oneLiner: "smooth, breathable, naturally luxe", care: "Hand wash cold or dry clean", careRank: 1 },
  alpaca: { name: "Alpaca", aliases: ["alpaca"], score: 9, tier: "Luxury", oneLiner: "warmer than wool, soft and long-lasting", care: "Hand wash cold, dry flat", careRank: 3 },
  mohair: { name: "Mohair", aliases: ["mohair"], score: 8, tier: "Luxury", oneLiner: "fluffy, light and very warm", care: "Hand wash cold, dry flat", careRank: 4 },
  merino: { name: "Merino wool", aliases: ["merino", "merino wool", "extra fine merino"], score: 8, tier: "Good", oneLiner: "soft, non-itchy wool that regulates temperature", care: "Wool cycle or hand wash, dry flat", careRank: 5 },
  wool: { name: "Wool", aliases: ["wool", "lambswool", "virgin wool", "new wool"], score: 7, tier: "Good", oneLiner: "warm, breathable, lasts for years", care: "Wool cycle or hand wash, dry flat", careRank: 6 },
  linen: { name: "Linen", aliases: ["linen", "flax"], score: 7, tier: "Good", oneLiner: "cool, breathable, gets softer with every wash", care: "Gentle wash, air dry", careRank: 9 },
  tencel: { name: "Tencel / Lyocell", aliases: ["tencel", "lyocell"], score: 6, tier: "Good", oneLiner: "silky, breathable plant-based fabric", care: "Gentle cool wash, air dry", careRank: 8 },
  cupro: { name: "Cupro", aliases: ["cupro"], score: 6, tier: "Good", oneLiner: "silky plant-based fabric, a nice alternative to silk", care: "Gentle cool wash, air dry", careRank: 8 },
  cotton: { name: "Cotton", aliases: ["cotton", "organic cotton", "pima cotton", "supima"], score: 6, tier: "Okay", oneLiner: "soft, breathable everyday fabric", care: "Machine wash 30°C", careRank: 11 },
  modal: { name: "Modal", aliases: ["modal"], score: 5, tier: "Okay", oneLiner: "soft and drapey, made from wood pulp", care: "Gentle cool wash", careRank: 8 },
  viscose: { name: "Viscose", aliases: ["viscose", "rayon", "ecovero"], score: 4, tier: "Okay", oneLiner: "drapey and soft but delicate, made from wood pulp", care: "Gentle cool wash, don't wring", careRank: 7 },
  nylon: { name: "Nylon", aliases: ["nylon", "polyamide"], score: 4, tier: "Budget", oneLiner: "strong synthetic, often added for durability", care: "Machine wash cool", careRank: 13 },
  polyester: { name: "Polyester", aliases: ["polyester", "recycled polyester", "poly"], score: 3, tier: "Budget", oneLiner: "plastic-based fabric, cheap to make", care: "Cool wash, no tumble dry", careRank: 14 },
  acrylic: { name: "Acrylic", aliases: ["acrylic"], score: 2, tier: "Budget", oneLiner: "plastic-based imitation of wool", care: "Cool wash, dry flat", careRank: 12 },
  elastane: { name: "Elastane", aliases: ["elastane", "spandex", "lycra"], score: null, tier: null, oneLiner: "adds stretch", care: null, careRank: null },
};

const TIER_COLORS = { Luxury: "#B57EDC", Good: "#6CC28E", Okay: "#F2C14E", Budget: "#E8697A" };
const TIER_EMOJI = { Luxury: "💜", Good: "🟩", Okay: "🟨", Budget: "🟥" };

const CURRENCIES = {
  GBP: { symbol: "£", rate: 1, round: 5 },
  USD: { symbol: "$", rate: 1.30, round: 5 },
  EUR: { symbol: "€", rate: 1.15, round: 5 },
  CAD: { symbol: "CA$", rate: 1.80, round: 5 },
  AUD: { symbol: "A$", rate: 2.00, round: 5 },
  AED: { symbol: "AED", rate: 4.80, round: 10 },
};

// Base price (in GBP) for the cheapest polyester version of each garment
const GARMENT_BASE_PRICE = {
  "T-shirt": 8,
  "Top/Blouse": 15,
  "Shirt": 18,
  "Jumper/Cardigan": 25,
  "Dress": 25,
  "Skirt": 20,
  "Trousers/Jeans": 25,
  "Jacket": 40,
  "Coat": 50,
};
