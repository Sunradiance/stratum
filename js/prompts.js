const PREMORTEM_STARTERS = [
  'It is 18 months from now. Our biggest strategic bet failed publicly. What assumption broke first?',
  'A competitor move we dismissed as irrelevant just took 15% of our pipeline. What did we assume wrongly?',
  'Our board asks why we missed the market shift everyone else saw. Which belief were we afraid to challenge?',
  'A key customer churned and cited something we never tracked as a risk. What assumption did their exit invalidate?',
  'We spent $XM on an initiative that shipped on time but changed nothing. What must-have belief was never true?',
];

const BLIND_SPOT_QUESTIONS = [
  'What does your team believe about customers that no other team has validated?',
  'Which compliance or security assumption has not been tested against a real incident scenario?',
  'What market trend are you betting against — and what evidence would change your mind?',
  'If your top KPI improved 20% but the business got worse, what hidden assumption would explain that?',
  'What decision is currently "pending" that relies on an assumption nobody owns?',
  'Which strategy pillar would collapse first if one assumption broke?',
  'What do you know that leadership assumes but has never written down?',
  'What signal would you ignore until it became a crisis?',
];

export function randomPremortem() {
  return PREMORTEM_STARTERS[Math.floor(Math.random() * PREMORTEM_STARTERS.length)];
}

export function randomBlindSpot() {
  return BLIND_SPOT_QUESTIONS[Math.floor(Math.random() * BLIND_SPOT_QUESTIONS.length)];
}