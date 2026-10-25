import './system-design.css';
export default function SystemDesign() {
  return (
    <div className="sd-blank" aria-label="System design canvas">
      <svg
        className="sd-diagram"
        viewBox="0 0 1680 1640"
        role="img"
        aria-label="User sends a question to the Web App, which sends it through a Load Balancer distributing requests across three server instances which enqueue investigations in a Job Queue. A pool of workers picks up jobs, each running the Agent System containing a Planner assigning checks to ad performance, inventory, and customer behavior specialists, a shared read-only Query Runner, and a Verifier that checks findings against evidence and requests rechecks when needed, which queries the Data Warehouse and receives results, saves progress and results in an Investigation Store, which servers read to return answers to the Web App"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path
              d="M2 2 L10 6 L2 10"
              fill="none"
              stroke="#526879"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        <g stroke="#263e50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="400" cy="132" r="24" fill="#f2f6f8" />
          <path d="M354 206v-13c0-21 20-34 46-34s46 13 46 34v13" fill="#f2f6f8" />
          <path d="M354 206h92" />
        </g>
        <text className="sd-label" x="340" y="232" textAnchor="end">
          User
        </text>
        <text className="sd-detail" x="422" y="342">
          Ask a question
        </text>
        <path d="M400 206 V434" fill="none" stroke="#dce5ea" strokeWidth="2.5" />
        <path
          className="sd-flow"
          d="M400 206 V434"
          fill="none"
          stroke="#526879"
          strokeWidth="2.5"
          markerEnd="url(#arrow)"
        />
        <g stroke="#263e50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="290" y="434" width="220" height="144" rx="10" fill="white" />
          <path d="M290 465h220" />
          <g fill="#9aabb6" stroke="none">
            <circle cx="306" cy="450" r="3" />
            <circle cx="317" cy="450" r="3" />
            <circle cx="328" cy="450" r="3" />
          </g>
          <rect x="343" y="445" width="149" height="10" rx="5" fill="#f0f4f6" stroke="none" />
          <rect x="306" y="482" width="44" height="79" rx="4" fill="#edf3f6" stroke="none" />
          <path d="M367 489h80M367 503h120" stroke="#b4c3cd" />
          <rect x="367" y="520" width="126" height="39" rx="4" fill="#f5f8fa" stroke="#dce5ea" />
        </g>
        <text className="sd-label" x="375" y="618" textAnchor="end">
          Web App
        </text>
        <text className="sd-detail" x="422" y="660">
          Send question
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M400 578 V695"
          fill="none"
          stroke="#526879"
          strokeWidth="2.5"
          markerEnd="url(#arrow)"
        />
        <g stroke="#263e50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="360" y="695" width="80" height="56" rx="8" fill="#f5f8fa" />
          <path d="M400 705v14m-23 0h46m-46 0v19m23-19v19m23-19v19" fill="none" />
        </g>
        <text className="sd-label" x="455" y="730" textAnchor="start">
          Load Balancer
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M400 751 V781 H295 M400 781 H505"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
        />
        <text className="sd-detail" x="530" y="785">
          Distribute requests
        </text>
        {[295, 400, 505].map((x, i) => (
          <g key={x}>
            <path
              className="sd-moving-arrow"
              pathLength="100"
              d={'M' + x + ' 781 V825'}
              fill="none"
              stroke="#526879"
              strokeWidth="2"
              markerEnd="url(#arrow)"
            />
            <text className="sd-detail" x={x + 9} y="809" style={{ fontSize: 11 }}>
              Request
            </text>
            <rect
              x={x - 40}
              y="825"
              width="80"
              height="30"
              rx="4"
              fill="#f5f8fa"
              stroke="#263e50"
              strokeWidth="2"
            />
            <rect
              x={x - 40}
              y="862"
              width="80"
              height="30"
              rx="4"
              fill="#f5f8fa"
              stroke="#263e50"
              strokeWidth="2"
            />
            <circle cx={x - 27} cy="840" r="3" fill="#8fa9b8" />
            <circle cx={x - 27} cy="877" r="3" fill="#8fa9b8" />
            <text className="sd-detail" x={x} y="919" textAnchor="middle">
              Server {i + 1}
            </text>
          </g>
        ))}
        <text className="sd-detail" x="400" y="951" textAnchor="middle">
          Same service · multiple instances
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M545 877 H560 V1010 H400 V1045"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="418" y="1000">
          Queue new investigation
        </text>
        <rect
          x="300"
          y="1045"
          width="200"
          height="75"
          rx="5"
          fill="white"
          stroke="#263e50"
          strokeWidth="2"
        />
        {[320, 360, 400, 440].map((x) => (
          <rect
            key={x}
            x={x}
            y="1061"
            width="26"
            height="42"
            rx="2"
            fill="#edf3f6"
            stroke="#9aabb6"
          />
        ))}
        <text className="sd-label" x="400" y="1153" textAnchor="middle">
          Job Queue
        </text>
        <path d="M500 1082 H700" fill="none" stroke="#dce5ea" strokeWidth="2" />
        <path
          className="sd-answer-flow"
          pathLength="100"
          d="M500 1082 H700"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="605" y="1063" textAnchor="middle">
          Available worker takes job
        </text>
        <rect
          x="700"
          y="753"
          width="560"
          height="850"
          rx="12"
          fill="none"
          stroke="#9aabb6"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
        <text className="sd-label" x="970" y="714" textAnchor="middle">
          Investigation Worker Pool
        </text>
        <text className="sd-detail" x="970" y="740" textAnchor="middle">
          Worker processes · concurrent investigation slots
        </text>
        <g stroke="#263e50" strokeWidth="2" strokeLinejoin="round">
          <rect x="715" y="765" width="530" height="650" rx="12" fill="white" />
          <rect x="738" y="818" width="204" height="114" rx="5" fill="#f5f8fa" stroke="#9aabb6" />
        </g>
        <rect
          x="1010"
          y="1010"
          width="210"
          height="114"
          rx="5"
          fill="#f5f8fa"
          stroke="#9aabb6"
          strokeWidth="2"
        />
        <text className="sd-label" x="1115" y="1043" textAnchor="middle">
          Query Runner
        </text>
        <text className="sd-detail" x="1115" y="1073" textAnchor="middle">
          Shared read-only tool
        </text>
        <text className="sd-detail" x="1115" y="1098" textAnchor="middle">
          Returns data
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M840 932 V990"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="856" y="962">
          Assign checks
        </text>
        <rect
          x="738"
          y="990"
          width="204"
          height="170"
          rx="5"
          fill="#f5f8fa"
          stroke="#9aabb6"
          strokeWidth="2"
        />
        <text className="sd-label" x="840" y="1020" textAnchor="middle">
          Specialists
        </text>
        <text className="sd-detail" x="840" y="1051" textAnchor="middle">
          Ad performance
        </text>
        <text className="sd-detail" x="840" y="1081" textAnchor="middle">
          Inventory
        </text>
        <text className="sd-detail" x="840" y="1111" textAnchor="middle">
          Customer behavior
        </text>
        <text className="sd-detail" x="840" y="1143" textAnchor="middle">
          Interpret the data
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M942 1058 H1010"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M1010 1100 H942"
          fill="none"
          stroke="#468477"
          strokeWidth="2"
          markerEnd="url(#return-arrow)"
        />
        <text className="sd-label" x="980" y="797" textAnchor="middle">
          Agent System
        </text>
        <text className="sd-label" x="840" y="851" textAnchor="middle">
          Planner
        </text>
        <text className="sd-detail" x="840" y="881" textAnchor="middle">
          Decides what to check
        </text>
        <text className="sd-detail" x="840" y="906" textAnchor="middle">
          Sales · Products · Inventory
        </text>
        <g stroke="#263e50" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M745 454 V550 C745 580 875 580 875 550 V454" fill="#f5f8fa" />
          <ellipse cx="810" cy="454" rx="65" ry="19" fill="#fff" />
          <path d="M745 500 C745 526 875 526 875 500" fill="none" stroke="#9aabb6" />
        </g>
        <text className="sd-label" x="810" y="612" textAnchor="middle">
          Data Warehouse
        </text>
        <text className="sd-detail" x="810" y="638" textAnchor="middle">
          Sales · Ads · Inventory
        </text>
        <path
          d="M1090 1010 V690 Q1090 665 1065 665 H900 V520 H875"
          fill="none"
          stroke="#dce5ea"
          strokeWidth="2.5"
        />
        <path
          className="sd-answer-flow"
          pathLength="100"
          d="M1090 1010 V690 Q1090 665 1065 665 H900 V520 H875"
          fill="none"
          stroke="#526879"
          strokeWidth="2.5"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="1020" y="650" textAnchor="middle">
          Query
        </text>
        <path
          d="M875 550 H1185 Q1210 550 1210 575 V1010"
          fill="none"
          stroke="#dce5ea"
          strokeWidth="2.5"
        />
        <path
          className="sd-answer-flow sd-display-flow"
          pathLength="100"
          d="M875 550 H1185 Q1210 550 1210 575 V1010"
          fill="none"
          stroke="#526879"
          strokeWidth="2.5"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="1220" y="650">
          Results
        </text>
        <g stroke="#263e50" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M335 1260 V1360 C335 1387 465 1387 465 1360 V1260" fill="#f5f8fa" />
          <ellipse cx="400" cy="1260" rx="65" ry="19" fill="white" />
        </g>
        <text className="sd-label" x="400" y="1410" textAnchor="middle">
          Investigation Store
        </text>
        <text className="sd-detail" x="400" y="1438" textAnchor="middle">
          Questions · Progress · Evidence · Answers
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M715 1310 H465"
          fill="none"
          stroke="#468477"
          strokeWidth="2"
          markerEnd="url(#return-arrow)"
        />
        <text className="sd-detail" x="595" y="1292" textAnchor="middle">
          Save stage + results
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M465 1350 H715"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="595" y="1382" textAnchor="middle">
          Load saved progress
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M275 892 V1270 H335"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="290" y="1190">
          Read saved status
        </text>
        <text className="sd-detail" x="290" y="1216">
          and results
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M335 1330 H210 V877 H255"
          fill="none"
          stroke="#468477"
          strokeWidth="2"
          markerEnd="url(#return-arrow)"
        />
        <text className="sd-detail" x="195" y="1190" textAnchor="end">
          Return status
        </text>
        <text className="sd-detail" x="195" y="1216" textAnchor="end">
          and results
        </text>
        <defs>
          <marker
            id="return-arrow"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path
              d="M2 2 L10 6 L2 10"
              fill="none"
              stroke="#468477"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
        <path
          d="M255 840 H220 V738 H360 M360 710 H200 V512 H290"
          fill="none"
          stroke="#dce5ea"
          strokeWidth="2.5"
        />
        <path
          className="sd-answer-flow sd-display-flow"
          d="M255 840 H220 V738 H360 M360 710 H200 V512 H290"
          pathLength="100"
          fill="none"
          stroke="#468477"
          strokeWidth="2.5"
          markerEnd="url(#return-arrow)"
        />
        <text className="sd-detail" x="190" y="590" textAnchor="end">
          Progress + answer
        </text>

        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M840 1160 V1245"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="858" y="1201">
          Findings + evidence
        </text>
        <rect
          x="738"
          y="1245"
          width="482"
          height="130"
          rx="5"
          fill="#f5f8fa"
          stroke="#9aabb6"
          strokeWidth="2"
        />
        <text className="sd-label" x="979" y="1278" textAnchor="middle">
          Verifier
        </text>
        <text className="sd-detail" x="979" y="1307" textAnchor="middle">
          Check findings against the evidence
        </text>
        <text className="sd-detail" x="979" y="1334" textAnchor="middle">
          Investigate again or report uncertainty.
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M1200 1245 H1232 V950 H965 V875 H942"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="1110" y="940" textAnchor="middle">
          Recheck with Planner
        </text>

        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M1220 1065 H1335"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="1280" y="1044" textAnchor="middle">
          Query fails
        </text>
        <rect
          x="1335"
          y="970"
          width="310"
          height="242"
          rx="7"
          fill="white"
          stroke="#9aabb6"
          strokeWidth="2"
        />
        <text className="sd-label" x="1490" y="1005" textAnchor="middle">
          Query failure handling
        </text>
        <text className="sd-detail" x="1355" y="1043">
          Temporary failure → limited retry
        </text>
        <text className="sd-detail" x="1355" y="1078">
          Invalid query → request correction
        </text>
        <text className="sd-detail" x="1355" y="1113">
          Still failing → mark check incomplete
        </text>
        <text className="sd-detail" x="1355" y="1153">
          Explain what could not be verified.
        </text>
        <text className="sd-detail" x="1355" y="1183">
          Missing results ≠ zero sales.
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M1335 1185 H1280 V1300 H1220"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="1300" y="1255">
          Unresolved failure
        </text>

        <rect
          x="1335"
          y="475"
          width="310"
          height="190"
          rx="12"
          fill="white"
          stroke="#263e50"
          strokeWidth="2"
        />
        <text className="sd-label" x="1490" y="517" textAnchor="middle">
          AI Model Service
        </text>
        <text className="sd-detail" x="1490" y="554" textAnchor="middle">
          Reasoning for Planner, Specialists
        </text>
        <text className="sd-detail" x="1490" y="580" textAnchor="middle">
          and Verifier
        </text>
        <text className="sd-detail" x="1490" y="625" textAnchor="middle">
          Shared model-call concurrency limit
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M1245 830 H1290 V545 H1335"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="1300" y="730">
          Instructions + context
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M1335 620 H1310 V900 H1245"
          fill="none"
          stroke="#468477"
          strokeWidth="2"
          markerEnd="url(#return-arrow)"
        />
        <text className="sd-detail" x="1320" y="870">
          Model response
        </text>

        <g stroke="#263e50" strokeWidth="2" strokeLinejoin="round">
          <path d="M1335 80 H1605 L1645 120 V300 H1335 Z" fill="white" />
          <path d="M1605 80 V120 H1645" fill="#edf3f6" />
        </g>
        <text className="sd-label" x="1490" y="130" textAnchor="middle">
          Business Context
        </text>
        <text className="sd-detail" x="1355" y="170">
          Revenue definition · Refund rules
        </text>
        <text className="sd-detail" x="1355" y="201">
          Reporting timezone · Data freshness
        </text>
        <text className="sd-detail" x="1355" y="232">
          Table relationships · Business goals
        </text>
        <text className="sd-detail" x="1355" y="273">
          Shared by the agent roles
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M1245 790 H1270 V230 H1335"
          fill="none"
          stroke="#526879"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <text className="sd-detail" x="1235" y="330" textAnchor="end">
          Request business context
        </text>
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M1335 270 H1255 V810 H1245"
          fill="none"
          stroke="#468477"
          strokeWidth="2"
          markerEnd="url(#return-arrow)"
        />

        <text className="sd-detail" x="1300" y="365">
          Return definitions + rules
        </text>
        <text className="sd-detail" x="976" y="1038" textAnchor="middle" style={{ fontSize: 12 }}>
          Run query
        </text>
        <text className="sd-detail" x="976" y="1125" textAnchor="middle" style={{ fontSize: 12 }}>
          Return data
        </text>
        <text className="sd-detail" x="205" y="780" textAnchor="end">
          Return progress + answer
        </text>

        <rect
          x="730"
          y="1440"
          width="500"
          height="135"
          rx="6"
          fill="#f5f8fa"
          stroke="#9aabb6"
          strokeWidth="2"
        />
        <text className="sd-label" x="980" y="1472" textAnchor="middle">
          Worker execution limits
        </text>
        <text className="sd-detail" x="980" y="1502" textAnchor="middle">
          Deadline · Retry cap · Model calls · Warehouse calls
        </text>
        <text className="sd-detail" x="980" y="1531" textAnchor="middle">
          Limit reached: stop work, save progress,
        </text>
        <text className="sd-detail" x="980" y="1556" textAnchor="middle">
          report partial findings and what remains unverified.
        </text>

        <defs>
          <marker
            id="poll-arrow"
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
          >
            <path d="M2 2 L10 6 L2 10" fill="none" stroke="#326bb2" strokeWidth="2" />
          </marker>
        </defs>
        <path
          d="M510 550 H635 V710 H440"
          fill="none"
          stroke="#326bb2"
          strokeWidth="3"
          markerEnd="url(#poll-arrow)"
        />
        <path
          className="sd-moving-arrow"
          pathLength="100"
          d="M510 550 H635 V710 H440"
          fill="none"
          stroke="#9cc5f2"
          strokeWidth="2"
        />
        <text className="sd-detail" x="650" y="665" style={{ fill: '#326bb2', fontWeight: 600 }}>
          Request progress
        </text>
        <text className="sd-detail" x="650" y="690" style={{ fill: '#326bb2' }}>
          Repeat while running
        </text>
        <text className="sd-detail" x="650" y="715">
          (by investigation ID)
        </text>
        <text className="sd-detail" x="400" y="1480" textAnchor="middle">
          Status: Queued → Running → Completed / Incomplete / Failed
        </text>
      </svg>
    </div>
  );
}
