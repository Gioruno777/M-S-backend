class APIFeatures {
    query: any
    queryString: any
    constructor(query: any, quertString: any) {
        this.query = query
        this.queryString = quertString
    }

    filter() {
        const queryObj = { ...this.queryString }
        const excludedFields = ['sort', 'keyword']
        excludedFields.forEach(el => delete queryObj[el])
        this.query = this.query.find(queryObj)
        return this
    }

    sort() {
        if (this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ')
            this.query = this.query.sort(sortBy)
        } else {
            this.query = this.query.sort('-_id')
        }
        return this
    }
}

export default APIFeatures