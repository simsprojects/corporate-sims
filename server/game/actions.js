/**
 * Complete actions database — ported from single-file game.
 * 40+ actions across 8 categories.
 */
export const ACTIONS = [
    // ========== SOUL-CRUSHING "WORK" ==========
    {
        id: 'work_hard', name: 'Actually Do Work (Rookie Mistake)', category: 'work',
        duration: 60, requiresArea: 'cubicle',
        needEffects: { energy: -25, fun: -20, comfort: -10 },
        emotionEffects: { boredom: 25, sadness: 10 },
        slackPoints: -15, state: 'working',
        speech: ['Why am I doing this?', '*soul leaving body*', 'This is fine...', 'I went to college for this?', 'Mom said I could be anything... I chose suffering', '*corporate Stockholm syndrome intensifies*', 'Is this what peak performance looks like?', 'My therapist will hear about this']
    },
    {
        id: 'synergize_paradigm', name: 'Synergize Paradigms', category: 'work',
        duration: 45, requiresArea: 'cubicle',
        needEffects: { energy: -20, fun: -15 },
        emotionEffects: { boredom: 30, anxiety: 10 },
        slackPoints: -10, state: 'working',
        speech: ['Leveraging core competencies...', 'Moving the needle...', 'Circling back...', 'Per my last email...', 'Lets unpack that...', 'I dont have the bandwidth...', 'Lets put a pin in it...', 'SYNERGY SYNERGY SYNERGY', 'Im just gonna piggyback off that']
    },
    {
        id: 'tps_reports', name: 'TPS Reports', category: 'work',
        duration: 50, requiresArea: 'cubicle',
        needEffects: { energy: -18, fun: -25, comfort: -5 },
        emotionEffects: { boredom: 40, sadness: 15 },
        slackPoints: -12, state: 'working',
        speech: ['Did you get the memo?', 'I have 8 bosses...', 'New cover sheet needed...', 'Yeahhh...']
    },
    {
        id: 'reply_all', name: 'Reply All Disaster', category: 'work',
        duration: 30, requiresArea: 'cubicle',
        needEffects: { energy: -10, social: -15 },
        emotionEffects: { anxiety: 40 },
        slackPoints: -8, state: 'working',
        speech: ['Oh no OH NO', 'UNSEND UNSEND', '*existential dread*', 'Maybe nobody saw it...', 'CTRL+Z CTRL+Z CTRL+Z', 'My resignation letter is ready...', '*prays to the email gods*', 'Witness protection program here I come']
    },

    // ========== THE ART OF LOOKING BUSY ==========
    {
        id: 'pretend_work', name: 'Strategic Keyboard Mashing', category: 'slack',
        duration: 30, requiresArea: 'cubicle',
        needEffects: { energy: -3, fun: 10 },
        emotionEffects: { boredom: -10, happiness: 5 },
        slackPoints: 10, state: 'working',
        speech: ['*aggressive typing sounds*', '*stares at spreadsheet*', 'Hmm, very interesting...', 'Almost done!']
    },
    {
        id: 'browse_reddit', name: 'Research (Reddit)', category: 'slack',
        duration: 45, requiresArea: 'cubicle',
        needEffects: { fun: 25, energy: -5 },
        emotionEffects: { boredom: -25, happiness: 15 },
        slackPoints: 12, state: 'sitting',
        speech: ['Market research...', '*alt+tabs furiously*', 'This is work-related I swear', 'The CEO does this, probably', 'Industry benchmarking!', 'Am I getting paid for this? *checks* Nice.', 'My boss is on Reddit too, this is networking']
    },
    {
        id: 'online_shopping', name: 'Competitive Analysis', category: 'slack',
        duration: 40, requiresArea: 'cubicle',
        needEffects: { fun: 20, energy: -3 },
        emotionEffects: { happiness: 20, boredom: -20 },
        slackPoints: 10, state: 'sitting',
        speech: ['Analyzing competitor pricing...', '*adds to cart*', 'Free shipping!', 'Its research!']
    },
    {
        id: 'desk_nap', name: 'Executive Rest Period', category: 'slack',
        duration: 25, requiresArea: 'cubicle',
        needEffects: { energy: 25, comfort: 15 },
        emotionEffects: { boredom: -5, happiness: 10 },
        slackPoints: 15, state: 'sitting',
        speech: ['*eyes closed, hand on mouse*', 'Deep thinking...', 'Ideating...', 'Zzz...', 'Meditating on Q3 targets...', 'Visualizing success...', '*drools on keyboard*', 'CEOs take power naps, Im basically a CEO']
    },
    {
        id: 'fake_phone_call', name: 'Important Client Call', category: 'slack',
        duration: 30, requiresArea: 'cubicle',
        needEffects: { fun: 15, energy: -5 },
        emotionEffects: { boredom: -15, excitement: 10 },
        slackPoints: 12, state: 'talking',
        speech: ['Uh huh... uh huh...', 'Absolutely, Mr. Definitely-Real...', '*nods at nothing*', 'Very important call.', 'Yes, I can hold for infinity...', '*talking to dial tone*', 'The CEO of Important Things sends his regards', 'Sorry, Fortune 500 company on line 2']
    },
    {
        id: 'reorganize_desk', name: 'Feng Shui Optimization', category: 'slack',
        duration: 35, requiresArea: 'cubicle',
        needEffects: { fun: 10, comfort: 15 },
        emotionEffects: { boredom: -10, anxiety: -5 },
        slackPoints: 8, state: 'standing',
        speech: ['*moves stapler 2 inches*', 'Much better!', 'Productivity optimization!', '*adjusts monitor*']
    },

    // ========== MEETINGS ==========
    {
        id: 'meeting', name: 'Meeting About Meetings', category: 'work',
        duration: 90, requiresArea: 'meeting',
        needEffects: { energy: -30, fun: -25, comfort: -15 },
        emotionEffects: { boredom: 50, sadness: 10 },
        slackPoints: -5, state: 'sitting',
        speech: ['Lets table that...', 'Circle back offline...', '*dies inside*', 'Great meeting everyone!', 'This could have been an email...', 'Im muted right? IM MUTED RIGHT?!', '*contemplates existence*', 'Has anyone actually achieved synergy?', 'Who scheduled this during lunch??']
    },
    {
        id: 'hide_meeting', name: 'Strategic Disengagement', category: 'slack',
        duration: 40, requiresArea: 'meeting',
        needEffects: { energy: 10, comfort: 15, fun: 5 },
        emotionEffects: { anxiety: -15, boredom: -10 },
        slackPoints: 15, state: 'sitting',
        speech: ['*counts ceiling tiles*', '*draws elaborate doodles*', '*plans weekend*', '*nods occasionally*', 'I have achieved enlightenment...', '*mentally designing my startup*', 'Wonder if Im on camera...', '*invents cure for cancer in head*', 'If I dont move, Im invisible']
    },
    {
        id: 'buzzword_bingo', name: 'Buzzword Bingo', category: 'slack',
        duration: 45, requiresArea: 'meeting',
        needEffects: { fun: 30, social: 10 },
        emotionEffects: { happiness: 25, boredom: -30 },
        slackPoints: 18, state: 'sitting',
        speech: ['SYNERGY! Thats a bingo!', 'Leverage... check!', 'Pivot! Almost there!', 'DISRUPTION! BINGO!']
    },
    {
        id: 'schedule_meeting', name: 'Schedule Future Meeting', category: 'slack',
        duration: 20, requiresArea: 'meeting',
        needEffects: { fun: 5 },
        emotionEffects: { boredom: -5 },
        slackPoints: 8, state: 'sitting',
        speech: ['Lets sync calendars...', 'How about never?', 'I have a hard stop...', 'Let me check my calendar...']
    },
    {
        id: 'give_presentation', name: 'Present Empty Slides', category: 'work',
        duration: 40, requiresArea: 'meeting',
        needEffects: { energy: -20, social: 10, fun: -15 },
        emotionEffects: { anxiety: 35 },
        slackPoints: -10, state: 'standing',
        speech: ['As this graph shows...', 'Moving forward...', 'To be determined...', '*reads slide word for word*']
    },

    // ========== ELITE SLACKING ==========
    {
        id: 'prank_coworker', name: 'Team Building Exercise', category: 'fun',
        duration: 35, requiresArea: 'cubicle', requiresOther: true,
        needEffects: { fun: 45, social: 20, energy: -10 },
        emotionEffects: { happiness: 35, excitement: 30, boredom: -30 },
        slackPoints: 20, state: 'standing',
        speech: ['*puts stapler in jello*', 'Identity theft is not a joke!', '*replaces family photos*', 'MICHAEL!']
    },
    {
        id: 'stare_at_camera', name: 'Break Fourth Wall', category: 'slack',
        duration: 5,
        needEffects: { fun: 15 },
        emotionEffects: { happiness: 10 },
        slackPoints: 5, state: 'idle',
        speech: ['*Jim face*', '*knowing look*', 'Are you seeing this?', 'Life moves pretty fast...']
    },
    {
        id: 'office_olympics', name: 'Office Olympics', category: 'fun',
        duration: 50, requiresArea: 'lounge',
        needEffects: { fun: 60, social: 35, energy: -15 },
        emotionEffects: { happiness: 45, excitement: 50, boredom: -50 },
        slackPoints: 25, state: 'standing',
        speech: ['FLONKERTON CHAMPION!', '*chair racing*', 'Yogurt lid medals!', 'This is professional development!']
    },
    {
        id: 'disappear_completely', name: 'Strategic Vanishing', category: 'slack',
        duration: 60,
        needEffects: { energy: 30, comfort: 25, fun: 20 },
        emotionEffects: { anxiety: -30, happiness: 20 },
        slackPoints: 25, state: 'walking',
        speech: ['*poof*', 'If they cant find me...', 'Ghost protocol activated', 'Working remotely (in the parking lot)', 'Schrodingers employee - I both exist and dont', 'Gone to milk carton status', 'Entering the Void...', '*becomes office cryptid*', 'Legend says I still work here']
    },

    // ========== KITCHEN ==========
    {
        id: 'coffee', name: '47th Coffee Today', category: 'need',
        duration: 20, requiresArea: 'kitchen',
        needEffects: { energy: 30, bladder: -20 },
        emotionEffects: { happiness: 10, anxiety: 5 },
        slackPoints: 5, state: 'standing',
        speech: ['*hands shaking*', 'I can quit anytime...', 'This is fine.', 'PRODUCTIVITY!', 'My blood type is now espresso', 'I see through time...', 'Sleep is for the weak', '*vibrating at molecular level*', 'Heart palpitations = passion']
    },
    {
        id: 'microwave_fish', name: 'Microwave Fish (War Crime)', category: 'chaos',
        duration: 15, requiresArea: 'kitchen',
        needEffects: { hunger: 35, social: -30 },
        emotionEffects: { happiness: 15 },
        slackPoints: 10, state: 'standing',
        speech: ['*presses 5 minutes*', 'What? Its healthy!', '*entire floor evacuates*', 'More for me!', 'Omega-3 chaos activated', '*fire alarm triggers*', 'Asserting dominance...', 'Geneva Convention? Never heard of it', 'Some people just want to watch the world burn']
    },
    {
        id: 'steal_lunch', name: 'Acquire Unlabeled Food', category: 'slack',
        duration: 10, requiresArea: 'kitchen',
        needEffects: { hunger: 30, fun: 15 },
        emotionEffects: { excitement: 15, anxiety: 10 },
        slackPoints: 12, state: 'standing',
        speech: ['Finders keepers...', 'No name, fair game!', '*checks for witnesses*', 'Corporate foraging!']
    },
    {
        id: 'gossip', name: 'Intel Gathering', category: 'social',
        duration: 35, requiresArea: 'kitchen',
        needEffects: { social: 35, fun: 20 },
        emotionEffects: { excitement: 25, happiness: 15 },
        slackPoints: 15, state: 'talking',
        speech: ['Did you HEAR?!', 'Dont tell anyone but...', '*whispers intensely*', 'I heard from HR...']
    },

    // ========== BATHROOM ==========
    {
        id: 'bathroom', name: 'Quick Break', category: 'need',
        duration: 10, requiresArea: 'bathroom',
        needEffects: { bladder: 80, comfort: 10 },
        slackPoints: 2, state: 'standing'
    },
    {
        id: 'bathroom_break_extended', name: 'Executive Retreat', category: 'slack',
        duration: 45, requiresArea: 'bathroom',
        needEffects: { bladder: 80, comfort: 30, fun: 25 },
        emotionEffects: { anxiety: -20, happiness: 15 },
        slackPoints: 20, state: 'standing',
        speech: ['*scrolling TikTok*', 'Five more minutes...', 'This is self-care.', '*legs going numb*', 'Time works differently here', 'Is that my boss knocking?!', 'Ive been here 47 minutes...', 'My legs stopped existing', 'Promoted to Bathroom CEO']
    },
    {
        id: 'bathroom_cry', name: 'Emotional Processing', category: 'emotional',
        duration: 20, requiresArea: 'bathroom',
        needEffects: { comfort: 30 },
        emotionEffects: { sadness: -35, anxiety: -25 },
        slackPoints: 10, state: 'standing',
        speech: ['*ugly crying*', 'Why did I major in this?', '*deep breaths*', 'I should start a podcast...', 'My parents think Im a lawyer...', '*existential screaming (quietly)*', 'Is this my villain origin story?', 'LinkedIn said I was a go-getter...', 'At least the toilet gets me']
    },

    // ========== LOUNGE ==========
    {
        id: 'nap', name: 'Power Ideation Session', category: 'slack',
        duration: 50, requiresArea: 'lounge',
        needEffects: { energy: 50, comfort: 30 },
        emotionEffects: { happiness: 20, anxiety: -25 },
        slackPoints: 20, state: 'sitting',
        speech: ['*snoring*', 'Brainstorming...', 'Processing synergies...', 'ZzZzZz...']
    },
    {
        id: 'games', name: 'Strategy Training', category: 'fun',
        duration: 45, requiresArea: 'lounge',
        needEffects: { fun: 45, energy: -10, social: 20 },
        emotionEffects: { happiness: 35, boredom: -40, excitement: 30 },
        slackPoints: 18, state: 'standing',
        speech: ['GET REKT!', 'Best of 7?', 'This builds teamwork!', 'WINNER STAYS!']
    },
    {
        id: 'bean_bag_therapy', name: 'Bean Bag Therapy', category: 'slack',
        duration: 40, requiresArea: 'lounge',
        needEffects: { comfort: 40, energy: 15, fun: 20 },
        emotionEffects: { happiness: 25, anxiety: -20 },
        slackPoints: 15, state: 'sitting',
        speech: ['*sinks into void*', 'I live here now.', 'Ergonomic excellence!', '*becomes one with bean bag*', 'This is my final form', 'Tell my family I found peace', 'Return to womb energy', 'The bean bag understands me']
    },

    // ========== SUPPLY CLOSET ==========
    {
        id: 'supply_closet_hide', name: 'Emergency Bunker', category: 'slack',
        duration: 30, requiresArea: 'supply',
        needEffects: { comfort: 20, energy: 15 },
        emotionEffects: { anxiety: -30 },
        slackPoints: 18, state: 'standing',
        speech: ['*hiding achieved*', 'They will never find me...', 'This is my Fortress of Solitude', '*phones boss* Im in a meeting', 'Witness protection program', 'I have become one with the Post-its', '*builds blanket fort*', 'Narnia? More like Car-nia', 'Office Gollum mode engaged']
    },

    // ========== BOSS ADJACENT ==========
    {
        id: 'visit_manager', name: 'Face Time (Not the App)', category: 'social',
        duration: 35, requiresArea: 'manager',
        needEffects: { social: 15, energy: -10, comfort: -10 },
        emotionEffects: { anxiety: 20 },
        slackPoints: 8, state: 'standing',
        speech: ['Great weather!', '*laughs at bad joke*', 'Brilliant idea, boss!', 'Yes, synergy!']
    },
    {
        id: 'take_credit', name: 'Visibility Enhancement', category: 'slack',
        duration: 25, requiresArea: 'manager',
        needEffects: { social: -10, fun: 15 },
        emotionEffects: { excitement: 20, anxiety: 10 },
        slackPoints: 20, state: 'talking',
        speech: ['As I was saying...', 'My idea actually...', 'I spearheaded that!', '*steals credit smoothly*', 'Great minds think alike (my mind first)', 'I basically invented this concept', 'We did it! (Royal we = me)', 'Teamwork makes MY dream work']
    },

    // ========== RECEPTION ==========
    {
        id: 'candy_jar', name: 'Networking Fuel', category: 'need',
        duration: 8, requiresArea: 'reception',
        needEffects: { hunger: 15, fun: 10, energy: 15 },
        emotionEffects: { happiness: 10 },
        slackPoints: 5, state: 'standing',
        speech: ['Just one... or twelve', '*fistful of candy*', 'For later!', 'These are for clients right?', '*empties entire jar into pockets*', 'Sugar is a business expense', 'Stress eating is a coping mechanism', 'Calories dont count if youre standing']
    },
    {
        id: 'flirt_reception', name: 'Strategic Rapport Building', category: 'social',
        duration: 30, requiresArea: 'reception',
        needEffects: { social: 30, fun: 20 },
        emotionEffects: { happiness: 20, excitement: 15 },
        slackPoints: 12, state: 'talking',
        speech: ['Hey...', 'Come here often?', '*leans awkwardly*', 'Nice... stapler.', 'Is that a new lanyard?', 'Your TPS reports are *chefs kiss*', 'Did it hurt? When you fell from the org chart?', 'Youre like a bonus, but for my eyes']
    },

    // ========== UNIVERSAL ==========
    {
        id: 'phone_scroll', name: 'Market Monitoring', category: 'slack',
        duration: 20,
        needEffects: { fun: 20, energy: -3 },
        emotionEffects: { boredom: -20, happiness: 10 },
        slackPoints: 8, state: 'standing',
        speech: ['*doom scrolling*', 'Checking... stocks...', '*likes everything*', 'Industry research!']
    },
    {
        id: 'long_walk', name: 'Walking Meeting (Solo)', category: 'slack',
        duration: 30,
        needEffects: { energy: -5, comfort: 15, fun: 15 },
        emotionEffects: { boredom: -15, anxiety: -15 },
        slackPoints: 12, state: 'walking',
        speech: ['*walks purposefully*', 'Very important errand...', 'Looking for printer...', 'Exercise is productive!', 'If you walk fast enough, youre unavailable', 'Speed = importance', 'Too busy, cant stop, big meeting', '*laps the building 4 times*']
    },
    {
        id: 'pretend_busy', name: 'Urgent Document Delivery', category: 'slack',
        duration: 15,
        needEffects: { fun: 10 },
        emotionEffects: { anxiety: -10 },
        slackPoints: 8, state: 'walking',
        speech: ['*carrying blank papers*', 'VERY URGENT!', 'Cant stop!', '*walks at CEO speed*']
    },
    {
        id: 'leave_early', name: 'Doctors Appointment', category: 'slack',
        duration: 5,
        needEffects: { fun: 30, energy: 10 },
        emotionEffects: { happiness: 40, excitement: 30 },
        slackPoints: 25, state: 'walking',
        speech: ['*grabs bag at 4:59*', 'Family emergency!', 'Traffic you know...', 'See you Monday... I mean tomorrow!', 'My goldfish is sick...', 'Dentist/Doctor/Shaman appointment', 'Irish goodbye activated', '*ninja smoke bomb*', 'I have to return some videotapes']
    },

    // ========== COWORKER WORK (Makes YOU Look Bad!) ==========
    {
        id: 'coworker_overtime', name: 'Coworker: Staying Late', category: 'coworker_work',
        duration: 60, requiresArea: 'cubicle',
        needEffects: { energy: -40, fun: -30 },
        emotionEffects: { sadness: 25, anxiety: 30 },
        slackPoints: -25, isCoworkerAction: true, makesYouLookBad: true, state: 'working',
        speech: ['Just need to finish this...', '*emails at 11pm*', 'Almost done!', "*CC's the whole company*"]
    },
    {
        id: 'coworker_volunteers', name: 'Coworker: Volunteers First', category: 'coworker_work',
        duration: 30, requiresArea: 'meeting',
        needEffects: { energy: -20, social: 20 },
        emotionEffects: { anxiety: 20 },
        slackPoints: -15, isCoworkerAction: true, makesYouLookBad: true, state: 'standing',
        speech: ["I'll take that on!", 'Happy to help!', 'No problem!', '*hand shoots up*']
    },
    {
        id: 'coworker_sucks_up', name: 'Coworker: Brown Nosing', category: 'coworker_work',
        duration: 25, requiresArea: 'manager',
        needEffects: { social: 30, energy: -10 },
        emotionEffects: { anxiety: 15 },
        slackPoints: -20, isCoworkerAction: true, makesYouLookBad: true, state: 'talking',
        speech: ['Great tie today, boss!', "You're so right!", '*laughs at terrible joke*', 'What a visionary!']
    },
    {
        id: 'coworker_early_arrival', name: 'Coworker: Here at 6AM', category: 'coworker_work',
        duration: 40, requiresArea: 'cubicle',
        needEffects: { energy: -30, comfort: -20 },
        emotionEffects: { sadness: 20 },
        slackPoints: -22, isCoworkerAction: true, makesYouLookBad: true, state: 'working',
        speech: ['Beat the traffic!', '*sends 5am emails*', 'Early bird!', '*judges everyone arriving at 9*']
    },
    {
        id: 'coworker_weekend_email', name: 'Coworker: Sunday Emails', category: 'coworker_work',
        duration: 20, requiresArea: 'cubicle',
        needEffects: { fun: -25 },
        emotionEffects: { anxiety: 35 },
        slackPoints: -18, isCoworkerAction: true, makesYouLookBad: true, state: 'sitting',
        speech: ['Just wanted to get ahead...', '*sent at 2am Sunday*', 'Hope this helps!', '*expects reply Monday*']
    },
    {
        id: 'coworker_presentation_prep', name: 'Coworker: Over-Prepared', category: 'coworker_work',
        duration: 45, requiresArea: 'cubicle',
        needEffects: { energy: -35, fun: -20 },
        emotionEffects: { anxiety: 25 },
        slackPoints: -20, isCoworkerAction: true, makesYouLookBad: true, state: 'working',
        speech: ['72 slide deck ready!', 'Added more graphs!', 'Font choice matters!', '*practices in mirror*']
    },
    {
        id: 'coworker_no_lunch', name: 'Coworker: Works Through Lunch', category: 'coworker_work',
        duration: 35, requiresArea: 'cubicle',
        needEffects: { hunger: -40, energy: -25 },
        emotionEffects: { sadness: 15 },
        slackPoints: -16, isCoworkerAction: true, makesYouLookBad: true, state: 'working',
        speech: ["I'll eat at my desk...", '*sad desk salad*', 'Too busy!', '*judges lunch takers*']
    },
    {
        id: 'coworker_extra_credit', name: 'Coworker: Takes On Extra Work', category: 'coworker_work',
        duration: 50, requiresArea: 'cubicle',
        needEffects: { energy: -30, fun: -25, comfort: -15 },
        emotionEffects: { anxiety: 30, sadness: 10 },
        slackPoints: -24, isCoworkerAction: true, makesYouLookBad: true, state: 'working',
        speech: ['I can handle more!', 'Actually, give me that too!', 'I have bandwidth!', '*drowning but smiling*']
    }
];

// Build lookup maps for fast access
export const ACTIONS_BY_ID = new Map(ACTIONS.map(a => [a.id, a]));
export const ACTIONS_BY_CATEGORY = new Map();
for (const action of ACTIONS) {
    if (!ACTIONS_BY_CATEGORY.has(action.category)) {
        ACTIONS_BY_CATEGORY.set(action.category, []);
    }
    ACTIONS_BY_CATEGORY.get(action.category).push(action);
}

export function getActionsForArea(areaType) {
    const areaMap = {
        manager: ['manager'], reception: ['reception'],
        annex: ['annex', 'cubicle'], supply: ['supply'],
        warehouse: ['warehouse'], meeting: ['meeting'],
        cubicle: ['cubicle'], kitchen: ['kitchen'],
        bathroom: ['bathroom'], lounge: ['lounge'],
        hallway: []
    };
    const validAreas = areaMap[areaType] || [areaType];
    return ACTIONS.filter(a => !a.requiresArea || validAreas.includes(a.requiresArea));
}
