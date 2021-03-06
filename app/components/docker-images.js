import React  from "react";
import dockerapi from "./../helpers/dockerapi";
import UpdateTable from "./../helpers/updateTable";
import moment from "moment";
import $ from "jquery"
import prettyBytes from "pretty-bytes";
import Progress from "./progress";

const getFormattedImageId = function(imageData) {
    return imageData.Id.split(":")[1].slice(0,12);
}

class DockerImageRow extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            imageID: getFormattedImageId(this.props.image)
        };

        this._handleClick = this._handleClick.bind(this);
    } // close constructor

    render () {
        const repoSplit = this.props.image.RepoTags[0].split(":");
        const tag = repoSplit.pop();
        const repo = repoSplit.join(":");
        const imageID = this.state.imageID;

        const checked = this.props.isSelected;

        return (
            <tr>
                <td>
                    <i className={ "toggle fa " + ((this.props.isLocked)?"locked ":"") + ((checked)?"fa-check-square-o":"fa-square-o") } onClick={ this._handleClick }/>
                </td>
                <td>{ repo }</td>
                <td>{ tag }</td>
                <td>{ imageID }</td>
                <td>{ moment.unix(this.props.image.Created).format("MM-DD-YYYY") }</td>
                <td>{ prettyBytes(this.props.image.Size) }</td>
            </tr>
        )
    } // close render

    _handleClick(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!this.props.isLocked) {
            this.props.onToggle(this.state.imageID);
        }
    } // close _handleClick
} // close DockerImageRow


class DockerImages extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            images: [],
            selectedImages: [],
            working: false,
            count: 0
        };

        this.interval = null;

        this._toggleImageID = this._toggleImageID.bind(this);
        this._deleteSelectedImagesClick = this._deleteSelectedImagesClick.bind(this);
        this._deleteSelectedImages = this._deleteSelectedImages.bind(this);

        $(window).on("resize", UpdateTable);
    } // close constructor

    componentDidMount() {
        this._updateImagesData();
        this.interval = setInterval( () => {
            this._updateImagesData();
        }, 1000);
    } // close componentDidMount

    componentWillUnmount() {
        clearInterval(this.interval);
    } // close componentWillUnmount

    componentDidUpdate() {
        UpdateTable();
    } // close componentDidUpdate

    _updateImagesData () {
        new dockerapi.get("images/json", (error, data) => {
            if (error) {
                console.log(error);
            } else {
                this.setState({
                    images: data
                })
            }
        })
    } // close _updateImagesData

    render() {
        return (
            <section>
                <table className="formatted docker-images">
                    <thead>
                        <tr>
                            <th />
                            <th>Repository</th>
                            <th>Tag</th>
                            <th>Image Id</th>
                            <th>Created</th>
                            <th>Size</th>
                        </tr>
                    </thead>
                    <tfoot>
                        <tr>
                            <td colSpan="6">
                                { (this.state.working)?(
                                        <Progress value={ parseInt(((this.state.count-this.state.selectedImages.length)/this.state.count)*100) } />
                                    ):(
                                        <button className={ "btn" + ((this.state.selectedImages.length > 0)?"":" disabled") } onClick={ this._deleteSelectedImagesClick }>Remove Selected</button>
                                    )
                                }
                            </td>
                        </tr>
                    </tfoot>
                    {
                        (Array.isArray(this.state.images))?(
                            <tbody>
                                {
                                    this.state.images.map( image => {
                                        return (
                                            <DockerImageRow
                                                key={ `image-${image.Id}` }
                                                image={ image }
                                                onToggle={ this._toggleImageID }
                                                isSelected={ this.state.selectedImages.some( (selectedImage) => { return selectedImage == getFormattedImageId(image) } ) }
                                                isLocked={ this.state.working }
                                            />
                                        );
                                    })
                                }
                            </tbody>
                        ):(
                            <tbody />
                        )
                    }
                </table>
            </section>
        );
    } // close render

    _deleteSelectedImagesClick(event) {
        event.preventDefault();
        event.stopPropagation();

        this.setState({
            working: true,
            count: this.state.selectedImages.length
        }, () => {
            this._deleteSelectedImages();
        });
    } // close _deleteSelectedImagesClick

    _deleteSelectedImages() {
        if (this.state.selectedImages.length > 0) {
            const selectedImages = this.state.selectedImages;
            const imageId = selectedImages.pop();
            new dockerapi.delete(`images/${imageId}`, (error, data) => {
                if (error) {
                    console.error(error);
                }
                if (data) {
                    console.log(data);
                }
                this.setState({
                    working: true,
                    selectedImages: selectedImages
                }, () => {
                    this._deleteSelectedImages()
                });
            });
        } else {
            this.setState({ working: false });
        }
    } // close _deleteSelectedImages

    _toggleImageID(imageId) {
        const selectedImages = this.state.selectedImages;
        const selectedIndex = selectedImages.findIndex(( thisImageID ) => { return thisImageID === imageId });

        if (selectedIndex >= 0) {
            selectedImages.splice(selectedIndex, 1);
        } else {
            selectedImages.push(imageId);
        }

        this.setState({ selectedImages: selectedImages });
    } // close _toggleImageID
} // close DockerImages

export default DockerImages;
