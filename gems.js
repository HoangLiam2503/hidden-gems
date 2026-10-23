// Hunt data. Everything a team needs to edit lives here.
//
// Coordinates were measured on site with tools/scout.html. Thresholds were
// calibrated from the reference photos (leave-one-out); re-check them with the
// scout tool on a real phone before the showcase.
//
// Fields:
//   id        folder name under gems/ (reference photos live in gems/<id>/)
//   name      shown after the gem is found
//   clue      the riddle that leads players to the spot
//   hints     revealed one at a time when the player asks
//   lat, lng  where the player should stand when taking the photo
//   radiusM   how close (meters) counts as "here"; use 40-60 for indoor spots
//   threshold minimum photo similarity (0-1) to pass; calibrate with scout
//   refs      reference photo filenames inside gems/<id>/
//   fact      the reward: a fact most people walk past

export const HUNT = {
  title: 'Hidden Gems',
  subtitle: 'A Bucknell campus photo hunt',
  // Judges test the first gem at the showcase, so it must stay within 500 ft.
  taylorHall: { lat: 40.95716, lng: -76.8831 },
};

export const GEMS = [
  {
    id: 'weeping',
    name: 'The Tree in a Stone Cloak',
    clue: 'Start on the lawn below the oldest hall on campus. One tree refuses to stand up straight. It weeps inside its own ring of stone. Photograph its whole cloak.',
    hints: [
      'It\'s on the lawn between Taylor and the Rooke Science Center.',
      'Look for a curved fieldstone wall.',
    ],
    lat: 40.956398, lng: -76.883258,
    radiusM: 35,
    threshold: 0.69,
    refs: ['ref1.jpg', 'ref2.jpg', 'ref3.jpg'],
    fact: 'Hundreds of students walk past this tiny walled garden every day on the way to class, and almost none of them look up.',
  },
  {
    id: 'stele',
    name: 'Messages from Another Time',
    clue: 'Leave the tree behind and head for the sciences. Beside a quiet entrance, a slab of white marble holds the universe\'s greatest hits, from E = mc² to the recipe for photosynthesis. Find the stone that remembers.',
    hints: [
      'It\'s tucked under the overhang of an entrance to the Rooke science buildings.',
      'Look for a white marble slab on pink legs, next to a bronze plaque.',
    ],
    lat: 40.955908, lng: -76.882826,
    radiusM: 40,
    threshold: 0.6,
    refs: ['ref1.jpg', 'ref2.jpg', 'ref3.jpg'],
    fact: 'This is "Stelae – Messages from Another Time" (1986) by artist Agnes Denes: humanity\'s great discoveries, from relativity to the bases of DNA, hand-carved in Carrara marble as a message to the future.',
  },
  {
    id: 'botany',
    name: 'Where Careers Take Root',
    clue: 'Step back out into the sun and head uphill. In the shadow of the oldest hall hides a little brick house named for the science of leaves. These days it grows something else. Find the word above its door.',
    hints: [
      'It\'s right next to Taylor Hall.',
      'Look for an orange picnic table and the word BOTANY.',
    ],
    lat: 40.956861, lng: -76.882971,
    radiusM: 35,
    threshold: 0.58,
    refs: ['ref1.jpg', 'ref2.jpg', 'ref3.jpg'],
    fact: 'The Botany Building is named for the study of plants, but today it houses the Center for Career Advancement. Students still come here to grow.',
  },
  {
    id: 'chalk',
    name: 'The Elements Underfoot',
    clue: 'Final gem. Science left a message on the ground: a rainbow grid of chemical symbols at the foot of the grand staircase. Find where Uranium meets Neptunium.',
    hints: [
      'The building with the giant columns: Robert L. Rooke Science Center.',
      'Look down at the plaza at the bottom of the steps.',
    ],
    lat: 40.956153, lng: -76.883408,
    radiusM: 35,
    threshold: 0.63,
    refs: ['ref1.jpg', 'ref2.jpg', 'ref3.jpg'],
    fact: 'Uranium (U), Neptunium (Np) and Plutonium (Pu) are elements 92, 93 and 94, named in order after Uranus, Neptune and Pluto. Here they sit side by side in chalk.',
  },
];
