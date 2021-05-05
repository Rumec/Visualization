import React from "react";
import Graph from "react-graph-vis";
import './graphStyle.css';
import SparseGraphPseudocode from "./SparseGraphPseudocode";
import SparseGraphSubprocedure from "./SparseGraphSubprocedure";
import SparseGraphDemoLoading from "./SparseGraphDemoLoading";
import SparseGraphDemoStep from "./SparseGraphDemoStep";
//import DFS from "./DFS";
//import SparseGraph from "./SparseGraph";

const RADIUS = 200;

class NetworkGraph extends React.Component {
    constructor(props) {
        super(props);
        this.visited = [];
        this.status = {
            LESS_THAN_DELTA_EDGES: 0,
            CYCLE_FOUND: 1,
            MORE_THAN_DELTA_EDGES: 2
        }

        // inspired by: https://gist.github.com/mucar/3898821
        this.color = ['#1AB399', '#F16FF1', '#F91AFF', '#06C6FF', '#4DB3FF',
            '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
            '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A',
            '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
            '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC',
            '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680',
            '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
            '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3',
            '#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6',
            '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'];

        this.state = {
            graphType: "sparse",
            sequenceToAdd: [],
            subprocedure: 0,
            subprocedureStep: 0,
            mainProcedureStep: 0,
            timeoutInput: 500,
            timeout: 500,
            followerList: {},

            e_in: {}, // JSON of lists in incoming edges
            delta: 0,

            inProgress: false,
            visited: [],
            addingEdge: false,
            from: 0,
            to: 0,
            numberOfVertices: 0,
            nodes: [],
            edges: [],
            b: [],
            c: []
        };
        this.handleChange = this.handleChange.bind(this);
        this.generateGraph = this.generateGraph.bind(this);
        this.addEdge = this.addEdge.bind(this);
        this.changeVertex = this.changeVertex.bind(this);
        this.colorEdge = this.colorEdge.bind(this);
        this.colorGraphToDefault = this.colorGraphToDefault.bind(this);
        this.changeProgress = this.changeProgress.bind(this);
        this.addVisitedVertex = this.addVisitedVertex.bind(this);
        this.clearVisitedVertices = this.clearVisitedVertices.bind(this);
        this.setTimeoutFromInput = this.setTimeoutFromInput.bind(this);
        this.addVertexToEin = this.addVertexToEin.bind(this);
        this.setEinOfVertex = this.setEinOfVertex.bind(this);
        this.setSubprocedureStep = this.setSubprocedureStep.bind(this);
        this.changeValue = this.changeValue.bind(this);
        this.cancelDemo = this.cancelDemo.bind(this);
        this.step = this.step.bind(this);
        this.handleDropdownChange = this.handleDropdownChange.bind(this);
    }

    async changeValue(id, newValue) {
        await this.setState({
            [id]: newValue
        })
    }

    /**
     * Sets step of the specified subprocedure for pseudocode animation
     *
     * @param subprocedure - Number of subprocedure we want to animate
     * @param step - Current step in specified subprocedure
     * @returns {Promise<void>}
     */
    async setSubprocedureStep(subprocedure, step) {
        await this.setState({
            subprocedure: subprocedure,
            subprocedureStep: step
        })
    }

    /**
     * Adds a vertex to the e_in set
     *
     * @param successor - Vertex which e_in should be expanded
     * @param predecessor - Vertex to be added
     * @returns {Promise<void>}
     */
    async addVertexToEin(successor, predecessor) {
        const oldEin = await this.state.e_in;
        await oldEin[successor].push(predecessor);
        await this.setState({
            e_in: oldEin,
        });
    }

    /**
     * Sets the set of incoming edges to be the value given as parameter
     *
     * @param vertex - ID of vertex which e_in should be changed
     * @param toBeSet - New value of e_in
     * @returns {Promise<void>}
     */
    async setEinOfVertex(vertex, toBeSet) {
        await this.setState(async prevState => {
            prevState.e_in[vertex] = await toBeSet;
            return prevState;
        })
    }

    /**
     * Handles changes of the controllers
     *
     * @param event - Object returned by event
     */
    handleChange(event) {
        const {name, /*type, */ value/*, checked*/} = event.target;

        //if (name === "from" || name === "to") {
        this.setState({
            [name]: parseInt(value)
        })
        //}

        /*
        (type === "checkbox") ? this.setState({[name]: checked})
            : (name === "addingEdge") ? this.setState(prevState => {
                return {
                    addingEdge: !prevState.addingEdge
                }
            })
            : this.setState({[name]: value});

         */
    }

    /**
     * Changes the actual graph type and also resets the graph properties
     *
     * @param event
     */
    handleDropdownChange(event) {
        this.setState({
            graphType: event.target.value,
            sequenceToAdd: [],
            subprocedure: 0,
            subprocedureStep: 0,
            mainProcedureStep: 0,
            timeoutInput: 500,
            timeout: 500,
            followerList: {},

            e_in: {}, // JSON of lists in incoming edges
            delta: 0,

            inProgress: false,
            visited: [],
            addingEdge: false,
            from: 0,
            to: 0,
            numberOfVertices: 0,
            nodes: [],
            edges: [],
            b: [],
            c: []
        });
    }

    /**
     * Generates new graph, sets levels of all vertices to 1
     *
     * @returns {Promise<void>}
     */
    async generateGraph() {
        let actualAngle = 0;
        let nodesArr = [];
        let bArr = [];
        let bTmp;
        let cArr = [];
        let cTmp;
        let followerList = {};
        let e_in = {};
        await this.setState({
            //sequenceToAdd: [],
            nodes: [],
        })
        for (let i = 1; i <= this.state.numberOfVertices; ++i) {
            bTmp = [];
            cTmp = [];
            for (let j = 1; j <= this.state.numberOfVertices; ++j) {
                bTmp.push(1);
                cTmp.push(0);
            }
            bArr.push(bTmp);
            cArr.push(cTmp);
            await nodesArr.push({
                id: i,
                level: 1,
                inDegree: 0,
                label: i.toString() + ", 1",
                title: i.toString(),
                color: this.color[0],
                x: RADIUS * Math.sin(actualAngle),
                y: RADIUS * Math.cos(actualAngle)
            });
            followerList[i] = [];
            e_in[i] = []; // initializing list of incoming edges
            actualAngle += await (2 * Math.PI) / (this.state.numberOfVertices);
        }
        await this.setState({
            mainProcedureStep: 0,
            followerList: followerList,
            e_in: e_in,
            nodes: nodesArr,
            edges: [],
            delta: 0,
            from: 0,
            to: 0,
            b: bArr,
            c: cArr
        });

        /**
         * Osetřit jinak!!!
         */
        if (this.state.sequenceToAdd.length !== 10) {
            this.setState({
                sequenceToAdd: []
            })
        }
    }

    /**
     * Adds new edge to graph
     * @param k_out - approximate level of an edge (used as key)
     * @returns {Promise<void>}
     */
    async addEdge(k_out = 1) {
        const from = parseInt(this.state.from);
        const to = parseInt(this.state.to);

        const oldEdges = await this.state.edges.slice();
        await oldEdges.push({
            from: from,
            to: to,
            color: "black",
            width: 3,
            k_out: k_out
        });

        const oldFollowerList = await this.state.followerList;
        await oldFollowerList[from].push(to);
        await this.setState({
            followerList: oldFollowerList,
            edges: oldEdges,
        });
    }

    DisplayAddingStatus() {
        if (this.state.addingEdge && this.state.from === 0) {
            return (
                <p>Select starting vertex</p>
            );
        } else if (this.state.addingEdge && this.state.from !== 0) {
            return (
                <p>Select ending vertex</p>
            );
        } else {
            return (<p>doing nothing</p>);
        }
    }

    /**
     * Action performed after node is selected via mouse click
     *
     * @param event - Event provided by mouse click
     * @returns {Promise<void>}
     */
    async selectVertex(event) {
        const {nodes} = event;

        if (this.state.addingEdge && this.state.from !== 0) {
            await this.setState({
                to: nodes[0],
                addingEdge: false
            });
            //await this.addEdge();
        }
        await this.setState({
            from: nodes[0]
        })

    }

    /**
     * Stops program for specified amount of time
     *
     * @param sleepTime - Time to sleep
     * @returns {Promise<unknown>}
     */
    sleepNow = (sleepTime) => new Promise((r) => setTimeout(r, sleepTime));

    /**
     * Changing parameters of vertex with given id to specified attributes
     *
     * @param id - ID of the node to be changed
     * @param color - Color to be set
     * @param levelIncrease - Value by which nodes level should be increased
     * @param degreeIncrease - Value by which nodes degree should be increased
     * @returns {Promise<void>}
     */
    async changeVertex(id, color, levelIncrease, degreeIncrease = 0) {
        await this.setState(prevState => {
            prevState.nodes = prevState.nodes.map(node => {
                if (node.id === id) {
                    return {
                        id: id,
                        level: node.level + levelIncrease,
                        inDegree: node.inDegree + degreeIncrease,
                        label: id.toString() + ", " + (node.level + levelIncrease).toString(),
                        title: node.title,
                        color: color
                    }
                }
                return node;
            })
            return {
                nodes: prevState.nodes
            };
        })
    }

    /**
     * Changes inProgress flag
     */
    changeProgress() {
        this.setState(prevState => {
            return {
                inProgress: !prevState.inProgress
            };
        })
    }

    /**
     * Adds vertex to set of visited vertices
     *
     * @param vertex - ID of vertex to be added
     * @returns {Promise<void>}
     */
    async addVisitedVertex(vertex) {
        await this.setState(prevState => {
            prevState.visited.push(vertex);
            return prevState;
        })
    }

    /**
     * Clears set of visited vertices
     *
     * @returns {Promise<void>}
     */
    async clearVisitedVertices() {
        await this.setState({
            visited: []
        })
    }

    /**
     * Colors given edge to red color (used for animation of searching through edges)
     *
     * @param from - Starting vertex of edge
     * @param to - Ending vertex of edge
     * @param color - Color of the edge
     * @returns {Promise<void>}
     */
    async colorEdge(from, to, color) {
        let oldEdges = await this.state.edges.slice();
        const index = oldEdges.findIndex(item =>
            item.from === from && item.to === to
        );
        const edgeKOut = oldEdges[index].k_out;
        await oldEdges.splice(index, 1);
        await oldEdges.push({
                from: from,
                to: to,
                k_out: edgeKOut,
                color: color,
                width: 3
            }
        )
        await this.setState({
            edges: oldEdges,
        });
    }

    async changeEdgesKOut(from, to, new_k_out) {
        let oldEdges = await this.state.edges.slice();
        const index = oldEdges.findIndex(item =>
            item.from === from && item.to === to
        );
        const edgesColor = oldEdges[index].color;
        await oldEdges.splice(index, 1);
        await oldEdges.push({
                from: from,
                to: to,
                k_out: new_k_out,
                color: edgesColor,
                width: 3
            }
        )
        await this.setState({
            edges: oldEdges,
        });
    }

    /**
     * Colors whole graph back to default colors
     *
     * @returns {Promise<void>}
     */
    async colorGraphToDefault() {
        /**
         * Coloring all edges back to black
         */
        let oldEdges = await this.state.edges.slice();
        for (let i = 0; i < oldEdges.length; ++i) {
            let tmpEdge = {
                from: oldEdges[0].from,
                to: oldEdges[0].to,
                k_out: oldEdges[0].k_out,
                color: "black",
                width: 3
            };

            await oldEdges.splice(0, 1);
            await oldEdges.push(tmpEdge);
        }

        await this.setState({
            edges: oldEdges,
        });

        /**
         * Coloring all vertices to default
         */
        await this.setState(prevState => {
            prevState.nodes = prevState.nodes.map(node => {
                node = {
                    id: node.id,
                    level: node.level,
                    inDegree: node.inDegree,
                    label: node.label,
                    title: node.title,
                    color: this.color[node.level - 1]
                }
                return node;
            })
            return {
                nodes: prevState.nodes
            };
        })
    }

    /**
     * Sets value of pause using value in number input
     */
    setTimeoutFromInput() {
        this.setState({
            timeout: this.state.timeoutInput
        })
    }


    /**************************/

    /* Sparse graph algorithm */

    /**
     * Main procedure of algorithm for sparse graphs
     *
     * @returns {Promise<boolean>}
     */
    async insertEdgeSparse() {
        let forward = false;
        let actualStatus;

        let fromVertex = this.state.nodes[this.state.nodes.findIndex(node => node.id === this.state.from)],
            toVertex = this.state.nodes[this.state.nodes.findIndex(node => node.id === this.state.to)];

        await this.changeVertex(fromVertex.id, "orange", 0);
        await this.changeVertex(toVertex.id, "orange", 0);

        await this.changeValue("mainProcedureStep", 1);
        await this.sleepNow(this.state.timeout);

        // await console.log("fromVertex:", fromVertex, "toVertex:", toVertex);
        console.log("delta:", this.state.delta);


        if (!(await this.testOrdering(this.state.from, this.state.to))) {

            /**
             * Opravit v implementaci a BP!!!
             */
            actualStatus = await this.backwardSearch(fromVertex.id, toVertex.id);

            if (actualStatus === this.status.CYCLE_FOUND) {
                await this.changeValue("mainProcedureStep", 4);
                await this.sleepNow(this.state.timeout);
                await this.changeValue("mainProcedureStep", 5);
                await this.sleepNow(this.state.timeout);
                await this.changeValue("mainProcedureStep", 0);

                return true;
            } else if (actualStatus === this.status.LESS_THAN_DELTA_EDGES && (toVertex.level < fromVertex.level)) {

                await this.changeValue("mainProcedureStep", 6);
                await this.sleepNow(this.state.timeout);
                await this.changeValue("mainProcedureStep", 7);
                await this.sleepNow(this.state.timeout);

                await this.changeVertex(toVertex.id, "orange", (fromVertex.level - toVertex.level));
                await this.setEinOfVertex(toVertex.id, []);
                forward = true;
            } else if (actualStatus === this.status.MORE_THAN_DELTA_EDGES) {

                await this.changeValue("mainProcedureStep", 8);
                await this.sleepNow(this.state.timeout);
                await this.changeValue("mainProcedureStep", 9);
                await this.sleepNow(this.state.timeout);

                await this.changeVertex(toVertex.id, "orange", ((fromVertex.level - toVertex.level) + 1));
                await this.setEinOfVertex(toVertex.id, []);
                await this.clearVisitedVertices();
                await this.addVisitedVertex(fromVertex.id);
                forward = true;
            }

            if (forward) {
                await this.changeValue("mainProcedureStep", 10);
                await this.setSubprocedureStep(3, 0);
                await this.sleepNow(this.state.timeout);

                actualStatus = (await this.forwardSearch(this.state.to));
                if (actualStatus) {
                    await this.changeValue("mainProcedureStep", 11);
                    await this.sleepNow(this.state.timeout);
                    await this.changeValue("mainProcedureStep", 0);

                    return true;
                }
            }
        }

        await this.colorGraphToDefault();

        await this.changeValue("mainProcedureStep", 12);
        await this.sleepNow(this.state.timeout);

        await this.addingEdge(fromVertex.id, toVertex.id);
        await this.clearVisitedVertices();
        await this.changeValue("mainProcedureStep", 0);
        await this.setSubprocedureStep(0, 0);
        return false;
    }

    async testOrdering(from, to) {
        let fromLevel = this.state.nodes[this.state.nodes.findIndex(node => node.id === from)].level,
            toLevel = this.state.nodes[this.state.nodes.findIndex(node => node.id === to)].level;

        await this.changeValue("mainProcedureStep", 2);
        await this.setSubprocedureStep(1, 0);
        await this.sleepNow(this.state.timeout);
        await this.setSubprocedureStep(1, 1);
        await this.sleepNow(this.state.timeout);
        await this.setSubprocedureStep(0, 0);
        return (fromLevel < toLevel);
    }

    async backwardSearch(start, w) {
        await this.changeValue("mainProcedureStep", 3);
        await this.setSubprocedureStep(2, 0);
        await this.sleepNow(this.state.timeout);
        await this.setSubprocedureStep(2, 1);
        await this.sleepNow(this.state.timeout);

        if (start === w) {
            await this.setSubprocedureStep(2, 2);
            await this.sleepNow(this.state.timeout);

            return this.status.CYCLE_FOUND;
        }
        await this.setSubprocedureStep(2, 3);
        await this.sleepNow(this.state.timeout);

        await this.addVisitedVertex(start);

        await this.setSubprocedureStep(2, 4);
        await this.sleepNow(this.state.timeout);
        if (this.state.e_in[start].length === 0 && this.state.visited.length >= this.state.delta + 1) {
            await this.setSubprocedureStep(2, 5);
            await this.sleepNow(this.state.timeout);

            return this.status.MORE_THAN_DELTA_EDGES;
        }

        for (let i = 0; i < this.state.e_in[start].length; ++i) {
            let predecessor = await this.state.e_in[start][i];

            await this.setSubprocedureStep(2, 8);
            await this.sleepNow(this.state.timeout);

            if (this.state.visited.length >= this.state.delta + 1) {

                await this.setSubprocedureStep(2, 9);
                await this.sleepNow(this.state.timeout);
                await this.setSubprocedureStep(0, 0);

                return this.status.MORE_THAN_DELTA_EDGES;
            }

            if (this.state.visited.includes(predecessor)) {
                continue;
            }

            // Coloring backward-searched edges
            await this.colorEdge(predecessor, start, "red");
            await this.setSubprocedureStep(2, 10);
            await this.sleepNow(this.state.timeout);
            let actualStatus = await this.backwardSearch(predecessor, w);

            await this.setSubprocedureStep(2, 11);
            await this.sleepNow(this.state.timeout);
            if (actualStatus === this.status.CYCLE_FOUND || actualStatus === this.status.MORE_THAN_DELTA_EDGES) {
                if (actualStatus === this.status.CYCLE_FOUND) {
                    await this.setSubprocedureStep(2, 12);
                    await this.sleepNow(this.state.timeout);
                } else if (actualStatus === this.status.MORE_THAN_DELTA_EDGES) {
                    await this.setSubprocedureStep(2, 13);
                    await this.sleepNow(this.state.timeout);
                }
                await this.setSubprocedureStep(0, 0);
                return actualStatus;
            }
            await this.setSubprocedureStep(2, 14);
            await this.sleepNow(this.state.timeout);
        }
        await this.setSubprocedureStep(2, 15);
        await this.sleepNow(this.state.timeout);
        await this.setSubprocedureStep(0, 0);
        return this.status.LESS_THAN_DELTA_EDGES;
    }

    async forwardSearch(w) {
        // Simulation of set (JS set is not very smart)
        await this.setSubprocedureStep(3, 1);
        await this.sleepNow(this.state.timeout);

        let F = [w];

        while (F.length) {
            await this.setSubprocedureStep(3, 2);
            await this.sleepNow(this.state.timeout);

            let actual = await F.pop();
            actual = this.state.nodes[this.state.nodes.findIndex(node => node.id === actual)];

            for (let i = 0; i < this.state.followerList[actual.id].length; ++i) {

                let successor = await this.state.followerList[actual.id][i];
                successor = this.state.nodes[this.state.nodes.findIndex(node => node.id === successor)];

                // Animation
                //console.log("Searching forward edge: (", actual.id, ", ", successor.id, ")");
                await this.colorEdge(actual.id, successor.id, "blue");
                await this.setSubprocedureStep(3, 3);
                await this.sleepNow(this.state.timeout);

                if (this.state.visited.includes(successor.id)) {
                    await this.setSubprocedureStep(3, 4);
                    await this.sleepNow(this.state.timeout);
                    await this.setSubprocedureStep(0, 0);

                    return true;
                }

                if (actual.level === successor.level) {
                    await this.setSubprocedureStep(3, 5);
                    await this.sleepNow(this.state.timeout);
                    await this.setSubprocedureStep(3, 6);
                    await this.sleepNow(this.state.timeout);

                    await this.addVertexToEin(successor.id, actual.id);
                } else if (actual.level > successor.level) {
                    await this.setSubprocedureStep(3, 7);
                    await this.sleepNow(this.state.timeout);
                    await this.setSubprocedureStep(3, 8);
                    await this.sleepNow(this.state.timeout);

                    await this.changeVertex(successor.id, this.color[successor.level + (actual.level - successor.level) - 1], (actual.level - successor.level));
                    await this.setEinOfVertex(successor.id, [actual.id]);
                    await F.push(successor.id);
                }
            }
        }
        await this.setSubprocedureStep(3, 9);
        await this.sleepNow(this.state.timeout);
        await this.setSubprocedureStep(0, 0);

        return false;
    }

    async addingEdge(from, to) {

        from = this.state.nodes[this.state.nodes.findIndex(node => node.id === from)];
        to = this.state.nodes[this.state.nodes.findIndex(node => node.id === to)];

        await this.setSubprocedureStep(4, 1);
        await this.sleepNow(this.state.timeout);

        await this.addEdge();

        if (from.level === to.level) {
            await this.setSubprocedureStep(4, 2);
            await this.sleepNow(this.state.timeout);
            await this.setSubprocedureStep(4, 3);
            await this.sleepNow(this.state.timeout);

            await this.addVertexToEin(to.id, from.id);
        }
        await this.setSubprocedureStep(4, 4);
        await this.sleepNow(this.state.timeout);

        await this.changeValue("delta", await Math.min(await Math.sqrt(this.state.edges.length),
            await Math.pow(this.state.nodes.length, (2 / 3))));

        await this.setSubprocedureStep(0, 0);
    }

    /**************************/

    async mainProcedure() {
        // console.log(this.state.from, this.state.to)
        if (!this.state.inProgress) {
            const from = parseInt(this.state.from);
            const to = parseInt(this.state.to);

            await this.changeProgress();

            if (to === from) {
                window.alert("Smyčky jsou zakázány!");
            } else if (this.state.edges.some(edge => edge.from === from && edge.to === to)) {
                window.alert("Hrana již existuje!");
            } else if (from > this.state.numberOfVertices || to > this.state.numberOfVertices ||
                from < 1 || to < 1) {
                await window.alert("Zvolené vrcholy se v grafu nenacházejí!");
            } else if (this.state.graphType === "sparse") {
                if (await this.insertEdgeSparse()) {
                    // Adding edge which creates cycle (green color)
                    await this.addEdge();
                    await this.colorEdge(this.state.from, this.state.to, "green");

                    await console.log("cycle");
                    await window.alert("Zjištěn cyklus!");
                }

            } else if (this.state.graphType === "dense") {
                console.log("prdel");
            }
            await this.changeProgress();
        }
    }


    async step() {
        await this.changeValue("from", this.state.sequenceToAdd[0][0]);
        await this.changeValue("to", this.state.sequenceToAdd[0][1]);
        /**
         * This is actual algorithm
         */
        await this.mainProcedure();

        let tmp = this.state.sequenceToAdd.slice();
        tmp.shift();
        await this.changeValue("sequenceToAdd", tmp);
    }

    SparseGraphDemoStep() {
        function renderTupleList(list) {
            let out = "";
            for (let i = 0; i < list.length; ++i) {
                out += "(" + list[i][0] + ", " + list[i][1] + ")";
                out += (i < list.length - 1) ? ", " : "";
            }
            return out;
        }

        return (
            <div
                className={"graphLayout"}
                style={{
                    marginLeft: 10
                }}
            >
                <div>
                    <p>Sekvence hran k vložení: {renderTupleList(this.state.sequenceToAdd)}</p>
                    <p>Přidávám hranu z {this.state.from} do {this.state.to}</p>
                    <br/>
                    <button
                        onClick={this.step}
                    >
                        Přidat hranu ze sekvence
                    </button>
                    <br/><br/>
                    <label>
                        <input
                            name={"timeoutInput"}
                            type={"number"}
                            value={this.state.timeoutInput}
                            onChange={this.handleChange}
                        />
                        Délka kroku
                    </label>
                    <button
                        onClick={this.setTimeoutFromInput}
                    >
                        Nastav délku kroku
                    </button>
                </div>
                <div>
                    <h2 style={{margin: 40}}>Delta= {this.state.delta}</h2>
                </div>
            </div>
        )
    }

    async cancelDemo() {
        await this.changeValue("sequenceToAdd", []);
        await this.changeValue("numberOfVertices", 0);
        await this.setSubprocedureStep(0, 0);
        await this.generateGraph();
        //await console.log(this.state.sequenceToAdd);
    }

    cancelDemoButton() {
        return (
            <button
                onClick={(!this.state.inProgress) ? this.cancelDemo : () => {
                }}
            >
                Zruš demo
            </button>
        )
    }

    manualAdding() {
        return (
            <div
                className={"graphLayout"}
                style={{
                    marginLeft: 10
                }}
            >
                <div>
                    <p>Přidávám hranu z {this.state.from} do {this.state.to}</p>
                    <br/>

                    <div>
                        <label>
                            <input
                                name={"from"}
                                type={"number"}
                                value={this.state.from}
                                onChange={(!this.state.inProgress) ? this.handleChange : () => {
                                }}
                            />
                            Výchozí vrchol
                        </label>

                        <label>
                            <input
                                name={"to"}
                                type={"number"}
                                value={this.state.to}
                                onChange={(!this.state.inProgress) ? this.handleChange : () => {
                                }}
                            />
                            Cílový vrchol
                        </label>

                        <button
                            onClick={() => {
                                this.mainProcedure();
                            }}
                        >
                            Vlož hranu
                        </button>
                    </div>
                    <br/>
                    <label>
                        <input
                            name={"timeoutInput"}
                            type={"number"}
                            value={this.state.timeoutInput}
                            onChange={this.handleChange}
                        />
                        Délka kroku
                    </label>
                    <button
                        onClick={this.setTimeoutFromInput}
                    >
                        Nastav délku kroku
                    </button>
                </div>
                <div>
                    <h2 style={{margin: 40}}>Delta= {this.state.delta}</h2>
                </div>
            </div>
        )
    }

    render() {
        const graph = {nodes: this.state.nodes, edges: this.state.edges};

        const options = {
            layout: {
                //hierarchical: true
            },
            edges: {
                color: "#000000",
                smooth: {type: "curvedCCW"}
            },
            physics: {
                enabled: false
            },
            height: "500px",
        };

        const events = {
            // arrow function can access scope of whole component class
            selectNode: async (event) => {
                //await this.selectVertex(event)
            },

            dragStart: async (event) => {
                //await this.selectVertex(event)
            }
        };
        return (
            <div>
                <div
                    className={"topPanel"}
                >
                    <div
                        className={"graphBox"}
                    >
                        <text style={{
                            fontWeight: "bold"
                        }}>Počet vrcholů:
                        </text>
                        <input
                            name={"numberOfVertices"}
                            type={"number"}
                            value={this.state.numberOfVertices}
                            onChange={this.handleChange}
                        />
                        <button
                            onClick={(!this.state.inProgress) ? this.generateGraph : () => {
                            }}
                        >
                            Generuj graf
                        </button>
                    </div>
                    <div
                        className={"pseudoCode"}
                    >
                        <SparseGraphDemoLoading
                            state={this.state}
                            changeValue={this.changeValue}
                            generateGraph={this.generateGraph}
                        />
                        {(this.state.sequenceToAdd.length !== 0 && !this.state.inProgress) ? this.cancelDemoButton() : () => {
                        }}
                    </div>
                    <div>
                        <label>
                            Vyberte algoritmus:
                            <select value={this.state.graphType} onChange={this.handleDropdownChange}>
                                <option value={"sparse"}>Algoritmus pro řídký graf</option>
                                <option value={"dense"}>Algoritmus pro hustý graf</option>
                            </select>
                        </label>
                    </div>
                </div>
                <hr/>
                <div
                    className={"graphLayout"}
                >
                    <div
                        className={"graphBox"}
                    >
                        <Graph
                            graph={graph}
                            options={options}
                            events={events}
                        />
                    </div>

                    <div
                        className={"pseudoCode"}
                    >
                        {(this.state.graphType === "sparse")? <SparseGraphPseudocode step={this.state.mainProcedureStep}/> : "dense" }
                    </div>

                    <div
                        className={"procedure"}
                    >
                        {(this.state.graphType === "sparse")? <SparseGraphSubprocedure
                            procedure={this.state.subprocedure}
                            step={this.state.subprocedureStep}
                        /> : "dense"}
                    </div>
                </div>
                <hr/>
                {(this.state.sequenceToAdd.length !== 0) ?
                    this.SparseGraphDemoStep()
                    : this.manualAdding()}
            </div>

        )
    }
}

export default NetworkGraph;


/*
                <DFS
                    state={this.state}
                    changeProgress={this.changeProgress}
                    colorGraphToDefault={this.colorGraphToDefault}
                    sleepNow={this.sleepNow}
                    visited={this.visited}
                    colorEdgeToRed={this.colorEdgeToRed}
                    changeVertex={this.changeVertex}
                    addVisitedVertices={this.addVisitedVertex}
                    clearVisitedVertices={this.clearVisitedVertices}
                />

                <button
                    name={"addingEdge"}
                    onClick={(!this.state.inProgress) ? this.handleChange : () => {
                    }}
                >
                    Add edge with mouse
                </button>

                {this.DisplayAddingStatus()}

                <button
                    name={"addingEdge"}
                    onClick={(!this.state.inProgress) ? this.handleChange : () => {
                    }}
                >
                    Add edge with mouse
                </button>

                 <button
                    onClick={(!this.state.inProgress) ? this.addEdge : () => {
                    }}
                >
                    Add edge
                </button>



                <SparseGraph
                    state={this.state}
                    sleepNow={this.sleepNow}
                    handleChange={this.handleChange}
                    colorGraphToDefault={this.colorGraphToDefault}
                    colorEdgeToRed={this.colorEdgeToRed}
                    changeProgress={this.changeProgress}
                    changeVertex={this.changeVertex}
                    addVisitedVertex={this.addVisitedVertex}
                    clearVisitedVertices={this.clearVisitedVertices}
                    addVertexToEin={this.addVertexToEin}
                    setEinOfVertex={this.setEinOfVertex}
                    addEdge={this.addEdge}
                    incrementM={this.incrementM}
                    setDelta={this.setDelta}
                />
 */